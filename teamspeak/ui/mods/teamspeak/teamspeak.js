$(function() {

	createFloatingFrame('teamspeak_frame', 150, 150, {'offset': 'topLeft', 'top': 80});

	$('#teamspeak_frame_content').append(
		'<ul id="tsplayer_list"></ul>'
	);

	//The following are taken straight from the ts3_websocket archive
	//Minor modifications have been done to rename elements
	
	var teamspeak = null;
	
	//main.js
	teamspeak = initializeTeamspeak({
        currentServerConnectionHandlerID: 0,
        server: {},
    
        /* helper methods */
        succeeded: function(errcode) {
            if (errcode == this.errorCodes.ERROR_ok)
                return true;
                
            console.log("Error occurred: " + this.errorString(errcode));
            return false;
        },
        
        getClientElement: function(serverConnectionHandlerID, clientID) {
            return $("#tsplayer_" + serverConnectionHandlerID + "_" + clientID);
        },
        getClientNameElement: function(serverConnectionHandlerID, clientID) {
            return $("#tsplayer_" + serverConnectionHandlerID + "_" + clientID + " .name");
        },
        getClientAvatarElement: function(serverConnectionHandlerID, clientID) {
            return $("#tsplayer_" + serverConnectionHandlerID + "_" + clientID + " .avatar");
        },
        getChatWindow: function() {
            return $("#tschat");
        },
        addClient: function(serverConnectionHandlerID, clientID) {
            var el = $("<li></li>", { class: "player", id: "tsplayer_" + serverConnectionHandlerID + "_" + clientID, serverConnectionHandlerID: serverConnectionHandlerID, clientID: clientID });
            el.append($("<img></img>", { class: "avatar", style: { display: "none" } }));
            el.append($("<span></span>", { class: "name" }));
            if (clientID == this.server[serverConnectionHandlerID].ownClientID)
                el.addClass("myself");

            $("#tsplayer_list").append(el);
            this.updateClient(serverConnectionHandlerID, clientID);
        },
        removeClient: function(serverConnectionHandlerID, clientID) {
            this.getClientElement(serverConnectionHandlerID, clientID).remove();
        },
        updateClient: function(serverConnectionHandlerID, clientID) {
            this.getChannelOfClient(serverConnectionHandlerID, clientID, function(errcode, channelID) {
                if (!this.succeeded(errcode))
                    return;
                this.getClientElement(serverConnectionHandlerID, clientID).attr("channelID", channelID);
            });
            this.getClientDisplayName(serverConnectionHandlerID, clientID, function(errcode, displayName) {
                if (!this.succeeded(errcode))
                    return;
                this.getClientNameElement(serverConnectionHandlerID, clientID).text(displayName);
            });
            if (clientID == this.server[serverConnectionHandlerID].ownClientID) {
                this.getClientSelfVariableAsInt(serverConnectionHandlerID, this.clientProperties.CLIENT_FLAG_TALKING, function(errcode, status) {
                    if (!this.succeeded(errcode))
                        return;
                    this.onTalkStatusChangeEvent({ serverConnectionHandlerID: serverConnectionHandlerID, clientID: clientID, status: status});
                });
            }
            else {
                this.getClientVariableAsInt(serverConnectionHandlerID, clientID, this.clientProperties.CLIENT_FLAG_TALKING, function(errcode, status) {
                    if (!this.succeeded(errcode))
                        return;
                    this.onTalkStatusChangeEvent({ serverConnectionHandlerID: serverConnectionHandlerID, clientID: clientID, status: status});
                });
            }
            this.getAvatar(serverConnectionHandlerID, clientID, function(errcode, avatar) {
                if (errcode == this.errorCodes.ERROR_ok)
                    this.getClientAvatarElement(serverConnectionHandlerID, clientID).attr("src", avatar + '#' + new Date().getTime()).show();
                else
                    this.getClientAvatarElement(serverConnectionHandlerID, clientID).hide();
            });
        },
        updateServer: function(serverConnectionHandlerID) {
            this.server[serverConnectionHandlerID] = {};
            this.getClientID(serverConnectionHandlerID, function(errcode, ownClientID) {
                if (!this.succeeded(errcode))
                    return;
                this.server[serverConnectionHandlerID].ownClientID = ownClientID;
                this.getClientList(serverConnectionHandlerID, function(errcode, clientList) {
                    if (!this.succeeded(errcode))
                        return;
                    for (var i in clientList)
                        this.addClient(serverConnectionHandlerID, clientList[i]);
                });
            })
        },
        cleanup: function() {
            this.server = {}
            this.currentServerConnectionHandlerID = 0;
            $(".player").remove();
        },
        /* end of helper methods */
    
        /* teamspeak callbacks */
        onConnectionEstablished: function() {
            console.debug("Connection established");
            this.getCurrentServerConnectionHandlerID(function(errcode, serverConnectionHandlerID) {
                if (!this.succeeded(errcode))
                    return;
                this.currentServerConnectionHandlerID = serverConnectionHandlerID;
                this.updateServer(serverConnectionHandlerID);
            });
        },
        onConnectionShutdown: function() {
            this.cleanup();
        },
        onTalkStatusChangeEvent: function(data) {
            var client = this.getClientElement(data.serverConnectionHandlerID, data.clientID);
            switch (data.status) {
                case this.talkStatus.STATUS_NOT_TALKING:
                    client.removeClass("whisper");
                    client.removeClass("talking_while_disabled");
                    client.removeClass("talking");
                    break;
                case this.talkStatus.STATUS_TALKING:
                    client.toggleClass("whisper", data.isReceivedWhisper == 1);
                    client.removeClass("talking_while_disabled");
                    client.addClass("talking");
                    break;
                case this.talkStatus.STATUS_TALKING_WHILE_DISABLED:
                    client.removeClass("whisper");
                    client.addClass("talking_while_disabled");
                    client.removeClass("talking");
                    break;
            }
        },
        onUpdateClientEvent: function(data) {
            this.updateClient(data.serverConnectionHandlerID, data.clientID);
        },
        onConnectStatusChangeEvent: function(data) {
            if (data.newStatus == 4)
                this.updateServer(data.serverConnectionHandlerID);
        },
        onClientSelfVariableUpdateEvent: function(data) {
            // ignored
        },
        onClientMoveEvent: function(data) {
            if (data.oldChannelID == 0)
                this.addClient(data.serverConnectionHandlerID, data.clientID);
            else if (data.newChannelID == 0)
                this.removeClient(data.serverConnectionHandlerID, data.clientID);
        },
        onClientKickFromServerEvent: function(data) {
            this.removeClient(data.serverConnectionHandlerID, data.clientID);
        },
        onUnhandledMessage: function(data, params) {
            console.debug("Unhandled message", data, params);
        },
        
        /* end of teamspeak callbacks */

        onHotkey_toggle_lock: function() {
            var disabled = $("#overlay_ct").draggable("option", "disabled");
            var draggable = disabled ? "enable" : "disable";
            var fadeTo = disabled ? 1.0 : 0.5;
            $("#overlay_ct").draggable(draggable).fadeTo(300, fadeTo);
            $("#chat_frame").draggable(draggable).fadeTo(300, fadeTo);
        },
        
        
    }, { verbose: 0 });

    if (!teamspeak) {
        console.log("WebSocket not supported!");
        return;
    }
	
	//websocket.js
	function initializeWebsocket(handler, options) {
		var socket = null;
		var open_transactions = {};
		var last_id = 0;
		var SOCKET_IDLE = 0;
		var SOCKET_CONNECTING = 1;
		var SOCKET_CONNECTED = 2;
		var SOCKET_DISCONNECTING = 3;
		var socketstate = SOCKET_IDLE;

		var handler = handler || {};
		var options = options || {};
		
		var default_options = {
			reconnect_timeout: 1000,
			hostname: '127.0.0.1',
			protocols: [],
			port: 80,
			verbose: 0
		};
		var default_handler = {
			onUnhandledMessage: function(event, params) { if (console && console.debug) console.debug("Unhandled message", "Message", event, "Params", params); },
			onUnhandledTransactionResponse: function(error, result, request) { if (console && console.debug) console.debug("Unhandled response", "Error", error, "Result", result, "Request", request); },
			onTimeout: function(request, callback) { if (console && console.debug) console.debug("Timeout occurred", "Request", request); },
			sendRequest: function(message) {
				var transaction = { id: ++last_id, request: { name: message } };
				var callback = null;
				for (var i = 1; i < arguments.length; ++i) {
					if (typeof(arguments[i]) == 'function')
						callback = arguments[i];
					else if (typeof(arguments[i]) == 'object')
						transaction.request.params = arguments[i];
					else if (typeof(arguments[i]) != 'undefined')
						return false;
				}
				if (options.verbose >= 1 && console && console.debug)
					console.debug("SEND", transaction.id, transaction.request.name, transaction.request.params);
				var transaction_text = JSON.stringify(transaction);
				if (options.verbose >= 2 && console && console.debug)
					console.debug("RAW SEND", transaction_text);
				
				transaction.callback = callback;
				transaction.timer = setTimeout(function() { handler.onTimeout.bind(handler)(transaction.request, transaction.callback) }, 2000);
				open_transactions[transaction.id] = transaction;
				return socket.send(transaction_text);
			},
			disconnect: function() {
				if (socketstate != SOCKET_IDLE) {
					socketstate = SOCKET_DISCONNECTING;
					socket.close();
				}
			}
		};
		for (var attribute in default_options) { if (!options[attribute]) options[attribute] = default_options[attribute]; }
		for (var attribute in default_handler) { if (!handler[attribute]) handler[attribute] = default_handler[attribute]; }
			
		if (!("WebSocket" in window))
			return false;

		function connect() {
			socket = new WebSocket("ws://" + options.hostname + ":" + options.port, options.protocols);
			socketstate = SOCKET_CONNECTING;
			socket.onopen = function() {
				console.debug("opened");
				socketstate = SOCKET_CONNECTED;
				if (handler.onConnectionEstablished)
					handler.onConnectionEstablished();
			};
			socket.onmessage = function (msg) {
				if (options.verbose >= 2 && console && console.debug)
					console.debug("RAW RECV", msg.data);
				var data = JSON.parse(msg.data);
				if (data.event) {
					if (options.verbose >= 1 && console && console.debug)
						console.debug("RECV", data.event, data.params);
					var eventname = data.event;
					var callback = handler[data.event];
					if (typeof(callback) != 'function')
						handler.onUnhandledMessage.bind(handler)(data.event, data.params);
					else
						callback.bind(handler)(data.params);
				}
				else if (data.response && data.id) {
					if (options.verbose >= 1 && console && console.debug)
						console.debug("RECV", data.id, data.response);
					var transaction = open_transactions[data.id];
					if (transaction) {
						delete open_transactions[data.id];
						clearTimeout(transaction.timer);
						transaction.timer = null;
						if (transaction.callback)
							transaction.callback.bind(handler)(data.response.error, data.response.result, transaction.request);
						else
							handler.onUnhandledTransactionResponse.bind(handler)(data.response.error, data.response.result, transaction.request);
					} else {
						// transaction too late, just ignore it
					}
				}
			};
			socket.onclose = function() {
				for (var transaction_id in open_transactions) {
					var transaction = open_transactions[transaction_id];
					delete open_transactions[data.id];
					clearTimeout(transaction.timer);
					transaction.timer = null;
					handler.onTimeout.bind(handler)(transaction.request, transaction.callback);
					open_transactions[transaction_id] = null;
				}
				switch (socketstate) {
					case SOCKET_IDLE : // huh?
						break;
					case SOCKET_CONNECTED :
					case SOCKET_CONNECTING :
						if (handler.onConnectionShutdown)
							handler.onConnectionShutdown();
						socketstate == SOCKET_CONNECTING;
						if (options.reconnect_timeout && options.reconnect_timeout > 0)
							setTimeout(function() { connect(); }, options.reconnect_timeout);
						break;
					case SOCKET_DISCONNECTING :
						socketstate = SOCKET_IDLE;
						break;
				}
			};
		}
		connect();
		return handler;
	}
	
	//teamspeak.js
	function initializeTeamspeak(handler, options) {
		var default_options = {
			protocols: [ 'teamspeak' ],
			port: 8666
		};
		var options = options || {};
		for (var attribute in default_options) { if (!options[attribute]) options[attribute] = default_options[attribute]; }

		var _errorCodes = {
			ERROR_ok                                     : 0x0000,
			ERROR_undefined                              : 0x0001,
			ERROR_not_implemented                        : 0x0002,
			ERROR_ok_no_update                           : 0x0003,
			ERROR_dont_notify                            : 0x0004,
			ERROR_lib_time_limit_reached                 : 0x0005,

			//dunno
			ERROR_command_not_found                      : 0x0100,
			ERROR_unable_to_bind_network_port            : 0x0101,
			ERROR_no_network_port_available              : 0x0102,

			//client
			ERROR_client_invalid_id                      : 0x0200,
			ERROR_client_nickname_inuse                  : 0x0201,
			ERROR_client_protocol_limit_reached          : 0x0203,
			ERROR_client_invalid_type                    : 0x0204,
			ERROR_client_already_subscribed              : 0x0205,
			ERROR_client_not_logged_in                   : 0x0206,
			ERROR_client_could_not_validate_identity     : 0x0207,
			ERROR_client_invalid_password                : 0x0208,
			ERROR_client_too_many_clones_connected       : 0x0209,
			ERROR_client_version_outdated                : 0x020a,
			ERROR_client_is_online                       : 0x020b,
			ERROR_client_is_flooding                     : 0x020c,

			//channel
			ERROR_channel_invalid_id                     : 0x0300,
			ERROR_channel_protocol_limit_reached         : 0x0301,
			ERROR_channel_already_in                     : 0x0302,
			ERROR_channel_name_inuse                     : 0x0303,
			ERROR_channel_not_empty                      : 0x0304,
			ERROR_channel_can_not_delete_default         : 0x0305,
			ERROR_channel_default_require_permanent      : 0x0306,
			ERROR_channel_invalid_flags                  : 0x0307,
			ERROR_channel_parent_not_permanent           : 0x0308,
			ERROR_channel_maxclients_reached             : 0x0309,
			ERROR_channel_maxfamily_reached              : 0x030a,
			ERROR_channel_invalid_order                  : 0x030b,
			ERROR_channel_no_filetransfer_supported      : 0x030c,
			ERROR_channel_invalid_password               : 0x030d,
			ERROR_channel_is_private_channel             : 0x030e,

			//server
			ERROR_server_invalid_id                      : 0x0400,
			ERROR_server_running                         : 0x0401,
			ERROR_server_is_shutting_down                : 0x0402,
			ERROR_server_maxclients_reached              : 0x0403,
			ERROR_server_invalid_password                : 0x0404,
			ERROR_server_deployment_active               : 0x0405,
			ERROR_server_unable_to_stop_own_server       : 0x0406,
			ERROR_server_is_virtual                      : 0x0407,
			ERROR_server_wrong_machineid                 : 0x0408,
			ERROR_server_is_not_running                  : 0x0409,
			ERROR_server_is_booting                      : 0x040a,
			ERROR_server_status_invalid                  : 0x040b,
			ERROR_server_modal_quit                      : 0x040c,

			//parameter
			ERROR_parameter_quote                        : 0x0600,
			ERROR_parameter_invalid_count                : 0x0601,
			ERROR_parameter_invalid                      : 0x0602,
			ERROR_parameter_not_found                    : 0x0603,
			ERROR_parameter_convert                      : 0x0604,
			ERROR_parameter_invalid_size                 : 0x0605,
			ERROR_parameter_missing                      : 0x0606,
			ERROR_parameter_checksum                     : 0x0607,

			//database
			ERROR_database                               : 0x0500,
			ERROR_database_empty_result                  : 0x0501,
			ERROR_database_duplicate_entry               : 0x0502,
			ERROR_database_no_modifications              : 0x0503,
			ERROR_database_constraint                    : 0x0504,
			ERROR_database_reinvoke                      : 0x0505,
			
			//unsorted, need further investigation
			ERROR_vs_critical                            : 0x0700,
			ERROR_connection_lost                        : 0x0701,
			ERROR_not_connected                          : 0x0702,
			ERROR_no_cached_connection_info              : 0x0703,
			ERROR_currently_not_possible                 : 0x0704,
			ERROR_failed_connection_initialisation       : 0x0705,
			ERROR_could_not_resolve_hostname             : 0x0706,
			ERROR_invalid_server_connection_handler_id   : 0x0707,
			ERROR_could_not_initialise_input_manager     : 0x0708,
			ERROR_clientlibrary_not_initialised          : 0x0709,
			ERROR_serverlibrary_not_initialised          : 0x070a,
			ERROR_whisper_too_many_targets               : 0x070b,
			ERROR_whisper_no_targets                     : 0x070c,

			//file transfer
			ERROR_file_invalid_name                      : 0x0800,
			ERROR_file_invalid_permissions               : 0x0801,
			ERROR_file_already_exists                    : 0x0802,
			ERROR_file_not_found                         : 0x0803,
			ERROR_file_io_error                          : 0x0804,
			ERROR_file_invalid_transfer_id               : 0x0805,
			ERROR_file_invalid_path                      : 0x0806,
			ERROR_file_no_files_available                : 0x0807,
			ERROR_file_overwrite_excludes_resume         : 0x0808,
			ERROR_file_invalid_size                      : 0x0809,
			ERROR_file_already_in_use                    : 0x080a,
			ERROR_file_could_not_open_connection         : 0x080b,
			ERROR_file_no_space_left_on_device           : 0x080c,
			ERROR_file_exceeds_file_system_maximum_size  : 0x080d,
			ERROR_file_transfer_connection_timeout       : 0x080e,
			ERROR_file_connection_lost                   : 0x080f,
			ERROR_file_exceeds_supplied_size             : 0x0810,
			ERROR_file_transfer_complete                 : 0x0811,
			ERROR_file_transfer_canceled                 : 0x0812,
			ERROR_file_transfer_interrupted              : 0x0813,
			ERROR_file_transfer_server_quota_exceeded    : 0x0814,
			ERROR_file_transfer_client_quota_exceeded    : 0x0815,
			ERROR_file_transfer_reset                    : 0x0816,
			ERROR_file_transfer_limit_reached            : 0x0817,
			
			//sound
			ERROR_sound_preprocessor_disabled            : 0x0900,
			ERROR_sound_internal_preprocessor            : 0x0901,
			ERROR_sound_internal_encoder                 : 0x0902,
			ERROR_sound_internal_playback                : 0x0903,
			ERROR_sound_no_capture_device_available      : 0x0904,
			ERROR_sound_no_playback_device_available     : 0x0905,
			ERROR_sound_could_not_open_capture_device    : 0x0906,
			ERROR_sound_could_not_open_playback_device   : 0x0907,
			ERROR_sound_handler_has_device               : 0x0908,
			ERROR_sound_invalid_capture_device           : 0x0909,
			ERROR_sound_invalid_playback_device          : 0x090a,
			ERROR_sound_invalid_wave                     : 0x090b,
			ERROR_sound_unsupported_wave                 : 0x090c,
			ERROR_sound_open_wave                        : 0x090d,
			ERROR_sound_internal_capture                 : 0x090e,
			ERROR_sound_device_in_use                    : 0x090f,
			ERROR_sound_device_already_registerred       : 0x0910,
			ERROR_sound_unknown_device                   : 0x0911,
			ERROR_sound_unsupported_frequency            : 0x0912,
			ERROR_sound_invalid_channel_count            : 0x0913,
			ERROR_sound_read_wave                        : 0x0914,
			ERROR_sound_need_more_data                   : 0x0915, //for internal purposes only
			ERROR_sound_device_busy                      : 0x0916, //for internal purposes only
			ERROR_sound_no_data                          : 0x0917,
			ERROR_sound_channel_mask_mismatch            : 0x0918,

			//permissions
			ERROR_permission_invalid_group_id            : 0x0a00,
			ERROR_permission_duplicate_entry             : 0x0a01,
			ERROR_permission_invalid_perm_id             : 0x0a02,
			ERROR_permission_empty_result                : 0x0a03,
			ERROR_permission_default_group_forbidden     : 0x0a04,
			ERROR_permission_invalid_size                : 0x0a05,
			ERROR_permission_invalid_value               : 0x0a06,
			ERROR_permissions_group_not_empty            : 0x0a07,
			ERROR_permissions_client_insufficient        : 0x0a08,
			ERROR_permissions_insufficient_group_power   : 0x0a09,
			ERROR_permissions_insufficient_permission_power : 0x0a0a,
			ERROR_permission_template_group_is_used      : 0x0a0b,
			
			//accounting
			ERROR_accounting_virtualserver_limit_reached : 0x0b00,
			ERROR_accounting_slot_limit_reached          : 0x0b01,
			ERROR_accounting_license_file_not_found      : 0x0b02,
			ERROR_accounting_license_date_not_ok         : 0x0b03,
			ERROR_accounting_unable_to_connect_to_server : 0x0b04,
			ERROR_accounting_unknown_error               : 0x0b05,
			ERROR_accounting_server_error                : 0x0b06,
			ERROR_accounting_instance_limit_reached      : 0x0b07,
			ERROR_accounting_instance_check_error        : 0x0b08,
			ERROR_accounting_license_file_invalid        : 0x0b09,
			ERROR_accounting_running_elsewhere           : 0x0b0a,
			ERROR_accounting_instance_duplicated         : 0x0b0b,
			ERROR_accounting_already_started             : 0x0b0c,
			ERROR_accounting_not_started                 : 0x0b0d,
			ERROR_accounting_to_many_starts              : 0x0b0e,

			//messages
			ERROR_message_invalid_id                     : 0x0c00,

			//ban
			ERROR_ban_invalid_id                         : 0x0d00,
			ERROR_connect_failed_banned                  : 0x0d01,
			ERROR_rename_failed_banned                   : 0x0d02,
			ERROR_ban_flooding                           : 0x0d03,

			//tts
			ERROR_tts_unable_to_initialize               : 0x0e00,

			//privilege key
			ERROR_privilege_key_invalid                  : 0x0f00,

			//voip
			ERROR_voip_pjsua                             : 0x1000,
			ERROR_voip_already_initialized               : 0x1001,
			ERROR_voip_too_many_accounts                 : 0x1002,
			ERROR_voip_invalid_account                   : 0x1003,
			ERROR_voip_internal_error                    : 0x1004,
			ERROR_voip_invalid_connectionId              : 0x1005,
			ERROR_voip_cannot_answer_initiated_call      : 0x1006,
			ERROR_voip_not_initialized                   : 0x1007,
			
			//provisioning server
			ERROR_provisioning_invalid_password          : 0x1100,
			ERROR_provisioning_invalid_request           : 0x1101,
			ERROR_provisioning_no_slots_available        : 0x1102,
			ERROR_provisioning_pool_missing              : 0x1103,
			ERROR_provisioning_pool_unknown              : 0x1104,
			ERROR_provisioning_unknown_ip_location       : 0x1105,
			ERROR_provisioning_internal_tries_exceeded   : 0x1106,
			ERROR_provisioning_too_many_slots_requested  : 0x1107,
			ERROR_provisioning_too_many_reserved         : 0x1108,
			ERROR_provisioning_could_not_connect         : 0x1109,
			ERROR_provisioning_auth_server_not_connected : 0x1110,
			ERROR_provisioning_auth_data_too_large       : 0x1111,
			ERROR_provisioning_already_initialized       : 0x1112,
			ERROR_provisioning_not_initialized           : 0x1113,
			ERROR_provisioning_connecting                : 0x1114,
			ERROR_provisioning_already_connected         : 0x1115,
			ERROR_provisioning_not_connected             : 0x1116,
			ERROR_provisioning_io_error                  : 0x1117,
			
			//websocket
			ERROR_transaction_timeout                    : 0x2000
		};
		var _errorStrings = {};
		for (var err in _errorCodes) { _errorStrings[_errorCodes[err]] = err; }

		default_handler = {
			errorCodes: _errorCodes,
			errorString: function(errno) {
				return _errorStrings[errno] || ("unknown error " + errno);
			},
			visibility: {
				ENTER_VISIBILITY: 0,
				RETAIN_VISIBILITY: 1,
				LEAVE_VISIBILITY: 2
			},
			connectStatus: {
				STATUS_DISCONNECTED: 0,
				STATUS_CONNECTING: 1,
				STATUS_CONNECTED: 2,
				STATUS_CONNECTION_ESTABLISHING: 3,
				STATUS_CONNECTION_ESTABLISHED: 4
			},
			talkStatus: {
				STATUS_NOT_TALKING: 0,
				STATUS_TALKING: 1,
				STATUS_TALKING_WHILE_DISABLED: 2
			},
			codecType: {
				CODEC_SPEEX_NARROWBAND: 0,
				CODEC_SPEEX_WIDEBAND: 1,
				CODEC_SPEEX_ULTRAWIDEBAND: 2,
				CODEC_CELT_MONO: 3,
				CODEC_OPUS_VOICE: 4,
				CODEC_OPUS_MUSIC: 5
			},
			codecEncryptionMode: {
				CODEC_ENCRYPTION_PER_CHANNEL: 0,
				CODEC_ENCRYPTION_FORCED_OFF: 1,
				CODEC_ENCRYPTION_FORCED_ON: 2
			},
			textMessageTargetMode: {
				TextMessageTarget_CLIENT: 1,
				TextMessageTarget_CHANNEL: 2,
				TextMessageTarget_SERVER: 3,
				TextMessageTarget_MAX: 4
			},
			muteInputStatus: {
				MUTEINPUT_NONE: 0,
				MUTEINPUT_MUTED: 1
			},
			muteOutputStatus: {
				MUTEOUTPUT_NONE: 0,
				MUTEOUTPUT_MUTED: 1
			},
			hardwareInputStatus: {
				HARDWAREINPUT_DISABLED: 0,
				HARDWAREINPUT_ENABLED: 1
			},
			hardwareOutputStatus: {
				HARDWAREOUTPUT_DISABLED: 0,
				HARDWAREOUTPUT_ENABLED: 1
			},
			inputDeactivationStatus: {
				INPUT_ACTIVE: 0,
				INPUT_DEACTIVATED: 1
			},
			reasonIdentifier: {
				REASON_NONE: 0,
				REASON_MOVED: 1,
				REASON_SUBSCRIPTION: 2,
				REASON_LOST_CONNECTION: 3,
				REASON_KICK_CHANNEL: 4,
				REASON_KICK_SERVER: 5,
				REASON_KICK_SERVER_BAN: 6,
				REASON_SERVERSTOP: 7,
				REASON_CLIENTDISCONNECT: 8,
				REASON_CHANNELUPDATE: 9,
				REASON_CHANNELEDIT: 10,
				REASON_CLIENTDISCONNECT_SERVER_SHUTDOWN: 11
			},
			channelProperties: {
				CHANNEL_NAME: 0,
				CHANNEL_TOPIC: 1,
				CHANNEL_DESCRIPTION: 2,
				CHANNEL_PASSWORD: 3,
				CHANNEL_CODEC: 4,
				CHANNEL_CODEC_QUALITY: 5,
				CHANNEL_MAXCLIENTS: 6,
				CHANNEL_MAXFAMILYCLIENTS: 7,
				CHANNEL_ORDER: 8,
				CHANNEL_FLAG_PERMANENT: 9,
				CHANNEL_FLAG_SEMI_PERMANENT: 10,
				CHANNEL_FLAG_DEFAULT: 11,
				CHANNEL_FLAG_PASSWORD: 12,
				CHANNEL_CODEC_LATENCY_FACTOR: 13,
				CHANNEL_CODEC_IS_UNENCRYPTED: 14,
				CHANNEL_ENDMARKER: 15
			},
			clientProperties: {
				CLIENT_UNIQUE_IDENTIFIER: 0,
				CLIENT_NICKNAME: 1,
				CLIENT_VERSION: 2,
				CLIENT_PLATFORM: 3,
				CLIENT_FLAG_TALKING: 4,
				CLIENT_INPUT_MUTED: 5,
				CLIENT_OUTPUT_MUTED: 6,
				CLIENT_OUTPUTONLY_MUTED: 7,
				CLIENT_INPUT_HARDWARE: 8,
				CLIENT_OUTPUT_HARDWARE: 9,
				CLIENT_INPUT_DEACTIVATED: 10,
				CLIENT_IDLE_TIME: 11,
				CLIENT_DEFAULT_CHANNEL: 12,
				CLIENT_DEFAULT_CHANNEL_PASSWORD: 13,
				CLIENT_SERVER_PASSWORD: 14,
				CLIENT_META_DATA: 15,
				CLIENT_IS_MUTED: 16,
				CLIENT_IS_RECORDING: 17,
				CLIENT_VOLUME_MODIFICATOR: 18,
				CLIENT_ENDMARKER: 19
			},
			virtualServerProperties: {
				VIRTUALSERVER_UNIQUE_IDENTIFIER: 0,
				VIRTUALSERVER_NAME: 1,
				VIRTUALSERVER_WELCOMEMESSAGE: 2,
				VIRTUALSERVER_PLATFORM: 3,
				VIRTUALSERVER_VERSION: 4,
				VIRTUALSERVER_MAXCLIENTS: 5,
				VIRTUALSERVER_PASSWORD: 6,
				VIRTUALSERVER_CLIENTS_ONLINE: 7,
				VIRTUALSERVER_CHANNELS_ONLINE: 8,
				VIRTUALSERVER_CREATED: 9,
				VIRTUALSERVER_UPTIME: 10,
				VIRTUALSERVER_CODEC_ENCRYPTION_MODE: 11,
				VIRTUALSERVER_ENDMARKER: 12
			},
			connectionProperties: {
				CONNECTION_PING: 0,
				CONNECTION_PING_DEVIATION: 1,
				CONNECTION_CONNECTED_TIME: 2,
				CONNECTION_IDLE_TIME: 3,
				CONNECTION_CLIENT_IP: 4,
				CONNECTION_CLIENT_PORT: 5,
				CONNECTION_SERVER_IP: 6,
				CONNECTION_SERVER_PORT: 7,
				CONNECTION_PACKETS_SENT_SPEECH: 8,
				CONNECTION_PACKETS_SENT_KEEPALIVE: 9,
				CONNECTION_PACKETS_SENT_CONTROL: 10,
				CONNECTION_PACKETS_SENT_TOTAL: 11,
				CONNECTION_BYTES_SENT_SPEECH: 12,
				CONNECTION_BYTES_SENT_KEEPALIVE: 13,
				CONNECTION_BYTES_SENT_CONTROL: 14,
				CONNECTION_BYTES_SENT_TOTAL: 15,
				CONNECTION_PACKETS_RECEIVED_SPEECH: 16,
				CONNECTION_PACKETS_RECEIVED_KEEPALIVE: 17,
				CONNECTION_PACKETS_RECEIVED_CONTROL: 18,
				CONNECTION_PACKETS_RECEIVED_TOTAL: 19,
				CONNECTION_BYTES_RECEIVED_SPEECH: 20,
				CONNECTION_BYTES_RECEIVED_KEEPALIVE: 21,
				CONNECTION_BYTES_RECEIVED_CONTROL: 22,
				CONNECTION_BYTES_RECEIVED_TOTAL: 23,
				CONNECTION_PACKETLOSS_SPEECH: 24,
				CONNECTION_PACKETLOSS_KEEPALIVE: 25,
				CONNECTION_PACKETLOSS_CONTROL: 26,
				CONNECTION_PACKETLOSS_TOTAL: 27,
				CONNECTION_SERVER2CLIENT_PACKETLOSS_SPEECH: 28,
				CONNECTION_SERVER2CLIENT_PACKETLOSS_KEEPALIVE: 29,
				CONNECTION_SERVER2CLIENT_PACKETLOSS_CONTROL: 30,
				CONNECTION_SERVER2CLIENT_PACKETLOSS_TOTAL: 31,
				CONNECTION_CLIENT2SERVER_PACKETLOSS_SPEECH: 32,
				CONNECTION_CLIENT2SERVER_PACKETLOSS_KEEPALIVE: 33,
				CONNECTION_CLIENT2SERVER_PACKETLOSS_CONTROL: 34,
				CONNECTION_CLIENT2SERVER_PACKETLOSS_TOTAL: 35,
				CONNECTION_BANDWIDTH_SENT_LAST_SECOND_SPEECH: 36,
				CONNECTION_BANDWIDTH_SENT_LAST_SECOND_KEEPALIVE: 37,
				CONNECTION_BANDWIDTH_SENT_LAST_SECOND_CONTROL: 38,
				CONNECTION_BANDWIDTH_SENT_LAST_SECOND_TOTAL: 39,
				CONNECTION_BANDWIDTH_SENT_LAST_MINUTE_SPEECH: 40,
				CONNECTION_BANDWIDTH_SENT_LAST_MINUTE_KEEPALIVE: 41,
				CONNECTION_BANDWIDTH_SENT_LAST_MINUTE_CONTROL: 42,
				CONNECTION_BANDWIDTH_SENT_LAST_MINUTE_TOTAL: 43,
				CONNECTION_BANDWIDTH_RECEIVED_LAST_SECOND_SPEECH: 44,
				CONNECTION_BANDWIDTH_RECEIVED_LAST_SECOND_KEEPALIVE: 45,
				CONNECTION_BANDWIDTH_RECEIVED_LAST_SECOND_CONTROL: 46,
				CONNECTION_BANDWIDTH_RECEIVED_LAST_SECOND_TOTAL: 47,
				CONNECTION_BANDWIDTH_RECEIVED_LAST_MINUTE_SPEECH: 48,
				CONNECTION_BANDWIDTH_RECEIVED_LAST_MINUTE_KEEPALIVE: 49,
				CONNECTION_BANDWIDTH_RECEIVED_LAST_MINUTE_CONTROL: 50,
				CONNECTION_BANDWIDTH_RECEIVED_LAST_MINUTE_TOTAL: 51,
				CONNECTION_ENDMARKER: 52
			},
			logTypes: {
				LogType_NONE: 0x0000,
				LogType_FILE: 0x0001,
				LogType_CONSOLE: 0x0002,
				LogType_USERLOGGING: 0x0004,
				LogType_NO_NETLOGGING: 0x0008,
				LogType_DATABASE: 0x0010
			},
			logLevel: {
				LogLevel_CRITICAL: 0,
				LogLevel_ERROR: 1,
				LogLevel_WARNING: 2,
				LogLevel_DEBUG: 3,
				LogLevel_INFO: 4,
				LogLevel_DEVEL: 5
			},
			groupWhisperType: {
				GROUPWHISPERTYPE_SERVERGROUP: 0,
				GROUPWHISPERTYPE_CHANNELGROUP: 1,
				GROUPWHISPERTYPE_CHANNELCOMMANDER: 2,
				GROUPWHISPERTYPE_ALLCLIENTS: 3,
				GROUPWHISPERTYPE_ENDMARKER: 4
			},
			groupWhisperTargetMode: {
				GROUPWHISPERTARGETMODE_ALL: 0,
				GROUPWHISPERTARGETMODE_CURRENTCHANNEL: 1,
				GROUPWHISPERTARGETMODE_PARENTCHANNEL: 2,
				GROUPWHISPERTARGETMODE_ALLPARENTCHANNELS: 3,
				GROUPWHISPERTARGETMODE_CHANNELFAMILY: 4,
				GROUPWHISPERTARGETMODE_ANCESTORCHANNELFAMILY: 5,
				GROUPWHISPERTARGETMODE_SUBCHANNELS: 6,
				GROUPWHISPERTARGETMODE_ENDMARKER: 7
			},
			monoSoundDestination: {
				MONO_SOUND_DESTINATION_ALL: 0,
				MONO_SOUND_DESTINATION_FRONT_CENTER: 1,
				MONO_SOUND_DESTINATION_FRONT_LEFT_AND_RIGHT: 2
			},
			pluginGuiProfile: {
				PLUGIN_GUI_SOUND_CAPTURE: 0,
				PLUGIN_GUI_SOUND_PLAYBACK: 1,
				PLUGIN_GUI_HOTKEY: 2,
				PLUGIN_GUI_SOUNDPACK: 3,
				PLUGIN_GUI_IDENTITY: 4
			},
			onUnhandledTransactionResponse: function(error, result, request) {
				 if (console && console.debug)
					console.debug("Unhandled response", "Error", this.errorString(error), "Result", result, "Request", request);
			},

			onTimeout: function(request, callback) {
				if (console && console.debug)
					console.debug("Timeout", request);
				if (callback)
					callback.bind(this)(this.ERROR_transaction_timeout, request);
			},
			
			getClientLibVersion: function(callback) {
				this.sendRequest("getClientLibVersion", callback);
			},
			getClientLibVersionNumber: function(callback) {
				this.sendRequest("getClientLibVersionNumber", callback);
			},
			spawnNewServerConnectionHandler: function(port, callback) {
				this.sendRequest("spawnNewServerConnectionHandler", { port: port }, callback);
			},
			destroyServerConnectionHandler: function(serverConnectionHandlerID, callback) {
				this.sendRequest("destroyServerConnectionHandler", { serverConnectionHandlerID: serverConnectionHandlerID }, callback);
			},
			getErrorMessage: function(errorCode, callback) {
				this.sendRequest("getErrorMessage", { errorCode: errorCode }, callback);
			},
			playWaveFile: function(serverConnectionHandlerID, path, callback) {
				this.sendRequest("playWaveFile", { serverConnectionHandlerID: serverConnectionHandlerID, path: path }, callback);
			},
			startVoiceRecording: function(serverConnectionHandlerID, callback) {
				this.sendRequest("startVoiceRecording", { serverConnectionHandlerID: serverConnectionHandlerID }, callback);
			},
			stopVoiceRecording: function(serverConnectionHandlerID, callback) {
				this.sendRequest("stopVoiceRecording", { serverConnectionHandlerID: serverConnectionHandlerID }, callback);
			},
			startConnection: function(serverConnectionHandlerID, identity, ip, port, nickname, defaultChannelArray, defaultChannelPassword, serverPassword, callback) {
				this.sendRequest("startConnection", { serverConnectionHandlerID: serverConnectionHandlerID, identity: identity, ip: ip, port: port, nickname: nickname, defaultChannelArray: defaultChannelArray, defaultChannelPassword: defaultChannelPassword, serverPassword: serverPassword }, callback);
			},
			stopConnection: function(serverConnectionHandlerID, quitMessage, callback) {
				this.sendRequest("stopConnection", { serverConnectionHandlerID: serverConnectionHandlerID, quitMessage: quitMessage }, callback);
			},
			requestClientMove: function(serverConnectionHandlerID, clientID, newChannelID, password, returnCode, callback) {
				this.sendRequest("requestClientMove", { serverConnectionHandlerID: serverConnectionHandlerID, clientID: clientID, newChannelID: newChannelID, password: password, returnCode: returnCode }, callback);
			},
			requestClientVariables: function(serverConnectionHandlerID, clientID, returnCode, callback) {
				this.sendRequest("requestClientVariables", { serverConnectionHandlerID: serverConnectionHandlerID, clientID: clientID, returnCode: returnCode }, callback);
			},
			requestClientKickFromChannel: function(serverConnectionHandlerID, clientID, kickReason, returnCode, callback) {
				this.sendRequest("requestClientKickFromChannel", { serverConnectionHandlerID: serverConnectionHandlerID, clientID: clientID, kickReason: kickReason, returnCode: returnCode }, callback);
			},
			requestClientKickFromServer: function(serverConnectionHandlerID, clientID, kickReason, returnCode, callback) {
				this.sendRequest("requestClientKickFromServer", { serverConnectionHandlerID: serverConnectionHandlerID, clientID: clientID, kickReason: kickReason, returnCode: returnCode }, callback);
			},
			requestChannelDelete: function(serverConnectionHandlerID, channelID, force, returnCode, callback) {
				this.sendRequest("requestChannelDelete", { serverConnectionHandlerID: serverConnectionHandlerID, channelID: channelID, force: force, returnCode: returnCode }, callback);
			},
			requestChannelMove: function(serverConnectionHandlerID, channelID, newChannelParentID, newChannelOrder, returnCode, callback) {
				this.sendRequest("requestChannelMove", { serverConnectionHandlerID: serverConnectionHandlerID, channelID: channelID, newChannelParentID: newChannelParentID, newChannelOrder: newChannelOrder, returnCode: returnCode }, callback);
			},
			requestSendPrivateTextMsg: function(serverConnectionHandlerID, message, targetClientID, returnCode, callback) {
				this.sendRequest("requestSendPrivateTextMsg", { serverConnectionHandlerID: serverConnectionHandlerID, message: message, targetClientID: targetClientID, returnCode: returnCode }, callback);
			},
			requestSendChannelTextMsg: function(serverConnectionHandlerID, message, targetChannelID, returnCode, callback) {
				this.sendRequest("requestSendChannelTextMsg", { serverConnectionHandlerID: serverConnectionHandlerID, message: message, targetChannelID: targetChannelID, returnCode: returnCode }, callback);
			},
			requestSendServerTextMsg: function(serverConnectionHandlerID, message, returnCode, callback) {
				this.sendRequest("requestSendServerTextMsg", { serverConnectionHandlerID: serverConnectionHandlerID, message: message, returnCode: returnCode }, callback);
			},
			requestConnectionInfo: function(serverConnectionHandlerID, clientID, returnCode, callback) {
				this.sendRequest("requestConnectionInfo", { serverConnectionHandlerID: serverConnectionHandlerID, clientID: clientID, returnCode: returnCode }, callback);
			},
			// requestClientSetWhisperList: function(serverConnectionHandlerID, clientID, targetChannelIDArray, targetClientIDArray, returnCode, callback) {
			//     this.sendRequest("requestClientSetWhisperList", { serverConnectionHandlerID: serverConnectionHandlerID, clientID: clientID, targetChannelIDArray: targetChannelIDArray, targetClientIDArray: targetClientIDArray, returnCode: returnCode }, callback);
			// },
			// requestChannelSubscribe: function(serverConnectionHandlerID, channelIDArray, returnCode, callback) {
			//     this.sendRequest("requestChannelSubscribe", { serverConnectionHandlerID: serverConnectionHandlerID, channelIDArray: channelIDArray, returnCode: returnCode }, callback);
			// },
			requestChannelSubscribeAll: function(serverConnectionHandlerID, returnCode, callback) {
				this.sendRequest("requestChannelSubscribeAll", { serverConnectionHandlerID: serverConnectionHandlerID, returnCode: returnCode }, callback);
			},
			// requestChannelUnsubscribe: function(serverConnectionHandlerID, channelIDArray, returnCode, callback) {
			//     this.sendRequest("requestChannelUnsubscribe", { serverConnectionHandlerID: serverConnectionHandlerID, channelIDArray: channelIDArray, returnCode: returnCode }, callback);
			// },
			requestChannelUnsubscribeAll: function(serverConnectionHandlerID, returnCode, callback) {
				this.sendRequest("requestChannelUnsubscribeAll", { serverConnectionHandlerID: serverConnectionHandlerID, returnCode: returnCode }, callback);
			},
			requestChannelDescription: function(serverConnectionHandlerID, channelID, returnCode, callback) {
				this.sendRequest("requestChannelDescription", { serverConnectionHandlerID: serverConnectionHandlerID, channelID: channelID, returnCode: returnCode }, callback);
			},
			// requestMuteClients: function(serverConnectionHandlerID, clientIDArray, returnCode, callback) {
			//     this.sendRequest("requestMuteClients", { serverConnectionHandlerID: serverConnectionHandlerID, clientIDArray: clientIDArray, returnCode: returnCode }, callback);
			// },
			// requestUnmuteClients: function(serverConnectionHandlerID, clientIDArray, returnCode, callback) {
			//     this.sendRequest("requestUnmuteClients", { serverConnectionHandlerID: serverConnectionHandlerID, clientIDArray: clientIDArray, returnCode: returnCode }, callback);
			// },
			requestClientPoke: function(serverConnectionHandlerID, clientID, message, returnCode, callback) {
				this.sendRequest("requestClientPoke", { serverConnectionHandlerID: serverConnectionHandlerID, clientID: clientID, message: message, returnCode: returnCode }, callback);
			},
			requestClientIDs: function(serverConnectionHandlerID, clientUniqueIdentifier, returnCode, callback) {
				this.sendRequest("requestClientIDs", { serverConnectionHandlerID: serverConnectionHandlerID, clientUniqueIdentifier: clientUniqueIdentifier, returnCode: returnCode }, callback);
			},
			clientChatClosed: function(serverConnectionHandlerID, clientUniqueIdentifier, clientID, returnCode, callback) {
				this.sendRequest("clientChatClosed", { serverConnectionHandlerID: serverConnectionHandlerID, clientID: clientID, returnCode: returnCode }, callback);
			},
			clientChatComposing: function(serverConnectionHandlerID, clientID, returnCode, callback) {
				this.sendRequest("clientChatComposing", { serverConnectionHandlerID: serverConnectionHandlerID, clientID: clientID, returnCode: returnCode }, callback);
			},
			requestServerTemporaryPasswordAdd: function(serverConnectionHandlerID, password, description, duration, targetChannelID, targetChannelPW, returnCode, callback) {
				this.sendRequest("requestServerTemporaryPasswordAdd", { serverConnectionHandlerID: serverConnectionHandlerID, password: password, description: description, duration: duration, targetChannelID: targetChannelID, targetChannelPW: targetChannelPW, returnCode: returnCode }, callback);
			},
			requestServerTemporaryPasswordDel: function(serverConnectionHandlerID, password, returnCode, callback) {
				this.sendRequest("requestServerTemporaryPasswordDel", { serverConnectionHandlerID: serverConnectionHandlerID, password: password, returnCode: returnCode }, callback);
			},
			requestServerTemporaryPasswordList: function(serverConnectionHandlerID, returnCode, callback) {
				this.sendRequest("requestServerTemporaryPasswordList", { serverConnectionHandlerID: serverConnectionHandlerID, returnCode: returnCode }, callback);
			},
			getClientID: function(serverConnectionHandlerID, callback) {
				this.sendRequest("getClientID", { serverConnectionHandlerID: serverConnectionHandlerID }, callback);
			},
			getClientSelfVariableAsInt: function(serverConnectionHandlerID, flag, callback) {
				this.sendRequest("getClientSelfVariableAsInt", { serverConnectionHandlerID: serverConnectionHandlerID, flag: flag }, callback);
			},
			getClientSelfVariableAsString: function(serverConnectionHandlerID, flag, callback) {
				this.sendRequest("getClientSelfVariableAsString", { serverConnectionHandlerID: serverConnectionHandlerID, flag: flag }, callback);
			},
			setClientSelfVariableAsInt: function(serverConnectionHandlerID, flag, value, callback) {
				this.sendRequest("setClientSelfVariableAsInt", { serverConnectionHandlerID: serverConnectionHandlerID, flag: flag }, callback);
			},
			setClientSelfVariableAsString: function(serverConnectionHandlerID, flag, value, callback) {
				this.sendRequest("setClientSelfVariableAsString", { serverConnectionHandlerID: serverConnectionHandlerID, flag: flag }, callback);
			},
			flushClientSelfUpdates: function(serverConnectionHandlerID, returnCode, callback) {
				this.sendRequest("flushClientSelfUpdates", { serverConnectionHandlerID: serverConnectionHandlerID, returnCode: returnCode }, callback);
			},
			getClientVariableAsInt: function(serverConnectionHandlerID, clientID, flag, callback) {
				this.sendRequest("getClientVariableAsInt", { serverConnectionHandlerID: serverConnectionHandlerID, clientID: clientID, flag: flag }, callback);
			},
			getClientVariableAsUInt64: function(serverConnectionHandlerID, clientID, flag, callback) {
				this.sendRequest("getClientVariableAsUInt64", { serverConnectionHandlerID: serverConnectionHandlerID, clientID: clientID, flag: flag }, callback);
			},
			getClientVariableAsString: function(serverConnectionHandlerID, clientID, flag, callback) {
				this.sendRequest("getClientVariableAsString", { serverConnectionHandlerID: serverConnectionHandlerID, clientID: clientID, flag: flag }, callback);
			},
			getClientList: function(serverConnectionHandlerID, callback) {
				this.sendRequest("getClientList", { serverConnectionHandlerID: serverConnectionHandlerID }, callback);
			},
			getChannelOfClient: function(serverConnectionHandlerID, clientID, callback) {
				this.sendRequest("getClientList", { serverConnectionHandlerID: serverConnectionHandlerID, clientID: clientID }, callback);
			},
			getChannelVariableAsInt: function(serverConnectionHandlerID, channelID, flag, callback) {
				this.sendRequest("getChannelVariableAsInt", { serverConnectionHandlerID: serverConnectionHandlerID, channelID: channelID, flag: flag }, callback);
			},
			getChannelVariableAsUInt64: function(serverConnectionHandlerID, channelID, flag, callback) {
				this.sendRequest("getChannelVariableAsUInt64", { serverConnectionHandlerID: serverConnectionHandlerID, channelID: channelID, flag: flag }, callback);
			},
			getChannelVariableAsString: function(serverConnectionHandlerID, channelID, flag, callback) {
				this.sendRequest("getChannelVariableAsString", { serverConnectionHandlerID: serverConnectionHandlerID, channelID: channelID, flag: flag }, callback);
			},
			// getChannelIDFromChannelNames: function(serverConnectionHandlerID, channelNameArray, callback) {
			//     this.sendRequest("getChannelIDFromChannelNames", { serverConnectionHandlerID: serverConnectionHandlerID, channelNameArray: channelNameArray }, callback);
			// },
			setChannelVariableAsInt: function(serverConnectionHandlerID, channelID, flag, value, callback) {
				this.sendRequest("setChannelVariableAsInt", { serverConnectionHandlerID: serverConnectionHandlerID, channelID: channelID, flag: flag, value: value }, callback);
			},
			setChannelVariableAsUInt64: function(serverConnectionHandlerID, channelID, flag, value, callback) {
				this.sendRequest("setChannelVariableAsUInt64", { serverConnectionHandlerID: serverConnectionHandlerID, channelID: channelID, flag: flag, value: value }, callback);
			},
			setChannelVariableAsString: function(serverConnectionHandlerID, channelID,  flag, value, callback) {
				this.sendRequest("setChannelVariableAsString", { serverConnectionHandlerID: serverConnectionHandlerID, channelID: channelID, flag: flag, value: value }, callback);
			},
			flushChannelUpdates: function(serverConnectionHandlerID, channelID, returnCode, callback) {
				this.sendRequest("flushChannelUpdates", { serverConnectionHandlerID: serverConnectionHandlerID, channelID: channelID, returnCode: returnCode }, callback);
			},
			flushChannelCreation: function(serverConnectionHandlerID, channelParentID, returnCode, callback) {
				this.sendRequest("flushChannelCreation", { serverConnectionHandlerID: serverConnectionHandlerID, channelID: channelID, returnCode: returnCode }, callback);
			},
			getChannelList: function(serverConnectionHandlerID, callback) {
				this.sendRequest("getChannelList", { serverConnectionHandlerID: serverConnectionHandlerID }, callback);
			},
			getChannelClientList: function(serverConnectionHandlerID, channelID,  callback) {
				this.sendRequest("getChannelClientList", { serverConnectionHandlerID: serverConnectionHandlerID, channelID: channelID }, callback);
			},
			getParentChannelOfChannel: function(serverConnectionHandlerID, channelID, callback) {
				this.sendRequest("getParentChannelOfChannel", { serverConnectionHandlerID: serverConnectionHandlerID, channelID: channelID }, callback);
			},
			getServerConnectionHandlerList: function(callback) {
				this.sendRequest("getServerConnectionHandlerList", callback);
			},
			getServerVariableAsInt: function(serverConnectionHandlerID, flag, callback) {
				this.sendRequest("getServerVariableAsInt", { serverConnectionHandlerID: serverConnectionHandlerID, flag: flag }, callback);
			},
			getServerVariableAsUInt64: function(serverConnectionHandlerID, flag, result) {
				this.sendRequest("getServerVariableAsUInt64", { serverConnectionHandlerID: serverConnectionHandlerID, flag: flag }, callback);
			},
			getServerVariableAsString: function(serverConnectionHandlerID, flag, result) {
				this.sendRequest("getServerVariableAsString", { serverConnectionHandlerID: serverConnectionHandlerID, flag: flag }, callback);
			},
			requestServerVariables: function(serverConnectionHandlerID) {
				this.sendRequest("getServerVariableAsInt", { serverConnectionHandlerID: serverConnectionHandlerID }, callback);
			},
			
			getConnectionStatus: function(serverConnectionHandlerID, callback) {
				this.sendRequest("getConnectionStatus", { serverConnectionHandlerID: serverConnectionHandlerID }, callback);
			},
			getConnectionVariableAsUInt64: function(serverConnectionHandlerID, clientID, flag, callback) {
				this.sendRequest("getConnectionVariableAsUInt64", { serverConnectionHandlerID: serverConnectionHandlerID, clientID: clientID, flag: flag }, callback);
			},
			// getConnectionVariableAsDouble: function(serverConnectionHandlerID, clientID, flag, callback) {
			//     this.sendRequest("getConnectionVariableAsDouble", { serverConnectionHandlerID: serverConnectionHandlerID, clientID: clientID, flag: flag }, callback);
			// },
			getConnectionVariableAsString: function( serverConnectionHandlerID, clientID, flag, callback) {
				this.sendRequest("getConnectionVariableAsString", { serverConnectionHandlerID: serverConnectionHandlerID, clientID: clientID, flag: flag }, callback);
			},
			cleanUpConnectionInfo: function(serverConnectionHandlerID, clientID, callback) {
				this.sendRequest("getConnectionVariableAsString", { serverConnectionHandlerID: serverConnectionHandlerID, clientID: clientID }, callback);
			},
			requestClientDBIDfromUID: function(serverConnectionHandlerID, clientUniqueIdentifier, returnCode, callback) {
				this.sendRequest("requestClientDBIDfromUID", { serverConnectionHandlerID: serverConnectionHandlerID, clientUniqueIdentifier: clientUniqueIdentifier, returnCode: returnCode }, callback);
			},
			requestClientNamefromUID: function(serverConnectionHandlerID, clientUniqueIdentifier, returnCode, callback) {
				this.sendRequest("requestClientNamefromUID", { serverConnectionHandlerID: serverConnectionHandlerID, clientUniqueIdentifier: clientUniqueIdentifier, returnCode: returnCode }, callback);
			},
			requestClientNamefromDBID: function(serverConnectionHandlerID, clientDatabaseID, returnCode, callback) {
				this.sendRequest("requestClientNamefromDBID", { serverConnectionHandlerID: serverConnectionHandlerID, clientDatabaseID: clientDatabaseID, returnCode: returnCode }, callback);
			},
			requestClientEditDescription: function(serverConnectionHandlerID, clientID, clientDescription, returnCode, callback) {
				this.sendRequest("requestClientDBIDfromUID", { serverConnectionHandlerID: serverConnectionHandlerID, clientID: clientID, clientDescription: clientDescription, returnCode: returnCode }, callback);
			},
			requestClientSetIsTalker: function(serverConnectionHandlerID, clientID, isTalker, returnCode, callback) {
				this.sendRequest("requestClientDBIDfromUID", { serverConnectionHandlerID: serverConnectionHandlerID, clientID: clientID, isTalker: isTalker, returnCode: returnCode }, callback);
			},
			requestIsTalker: function(serverConnectionHandlerID, isTalkerRequest, isTalkerRequestMessage, returnCode, callback) {
				this.sendRequest("requestClientDBIDfromUID", { serverConnectionHandlerID: serverConnectionHandlerID, isTalkerRequest: isTalkerRequest, isTalkerRequestMessage: isTalkerRequestMessage, returnCode: returnCode }, callback);
			},
			requestSendClientQueryCommand: function(serverConnectionHandlerID, command, returnCode, callback) {
				this.sendRequest("requestSendClientQueryCommand", { serverConnectionHandlerID: serverConnectionHandlerID, command: command, returnCode: returnCode }, callback);
			},
			
			
			getTransferFileName: function(transferID, callback) {
				this.sendRequest("getTransferFileName", { transferID: transferID }, callback);
			},
			getTransferFilePath: function(transferID, callback) {
				this.sendRequest("getTransferFilePath", { transferID: transferID }, callback);
			},
			getTransferFileSize: function(transferID, callback) {
				this.sendRequest("getTransferFileSize", { transferID: transferID }, callback);
			},
			getTransferFileSizeDone: function(transferID, callback) {
				this.sendRequest("getTransferFileSizeDone", { transferID: transferID }, callback);
			},
			isTransferSender: function(transferID, callback) {
				this.sendRequest("isTransferSender", { transferID: transferID }, callback);
			},
			getTransferStatus: function(transferID, callback) {
				this.sendRequest("getTransferStatus", { transferID: transferID }, callback);
			},
			// getCurrentTransferSpeed: function(transferID, callback) {
			//     this.sendRequest("getCurrentTransferSpeed", { transferID: transferID }, callback);
			// },
			// getAverageTransferSpeed: function(transferID, callback) {
			//     this.sendRequest("getAverageTransferSpeed", { transferID: transferID }, callback);
			// },
			getTransferRunTime: function(transferID, callback) {
				this.sendRequest("getTransferRunTime", { transferID: transferID }, callback);
			},
			// sendFile: function(serverConnectionHandlerID, channelID, channelPW, file, overwrite, resume, sourceDirectory, returnCode, callback) {
			//     this.sendRequest("sendFile", { serverConnectionHandlerID: serverConnectionHandlerID, channelID: channelID, channelPW: channelPW, file: file, overwrite: overwrite, resume: resume, sourceDirectory: sourceDirectory, returnCode: returnCode}, callback);
			// },
			// requestFile: function(serverConnectionHandlerID, channelID, channelPW, file, overwrite, resume, destinationDirectory, returnCode, callback)
			//     this.sendRequest("sendFile", { serverConnectionHandlerID: serverConnectionHandlerID, channelID: channelID, channelPW: channelPW, file: file, overwrite: overwrite, resume: resume, destinationDirectory: destinationDirectory, returnCode: returnCode}, callback);
			// },
			haltTransfer: function(serverConnectionHandlerID, transferID, deleteUnfinishedFile, returnCode, callback) {
				this.sendRequest("haltTransfer", { serverConnectionHandlerID: serverConnectionHandlerID, transferID: transferID, deleteUnfinishedFile: deleteUnfinishedFile, returnCode: returnCode }, callback);
			},
			requestFileList: function(serverConnectionHandlerID, channelID, channelPW, path, returnCode, callback) {
				this.sendRequest("requestFileList", { serverConnectionHandlerID: serverConnectionHandlerID, channelID: channelID, channelPW: channelPW, path: path, returnCode: returnCode }, callback);
			},
			requestFileInfo: function(serverConnectionHandlerID, channelID, channelPW, file, returnCode, callback) {
				this.sendRequest("requestFileInfo", { serverConnectionHandlerID: serverConnectionHandlerID, channelID: channelID, channelPW: channelPW, file: file, returnCode: returnCode }, callback);
			},
			// requestDeleteFile: function(serverConnectionHandlerID, channelID, channelPW, file, returnCode, callback) {
			//     this.sendRequest("requestDeleteFile", { serverConnectionHandlerID: serverConnectionHandlerID, channelID: channelID, channelPW: channelPW, file: file, returnCode: returnCode }, callback);
			// },
			requestCreateDirectory: function(serverConnectionHandlerID, channelID, channelPW, directoryPath, returnCode, callback) {
				this.sendRequest("requestCreateDirectory", { serverConnectionHandlerID: serverConnectionHandlerID, channelID: channelID, channelPW: channelPW, directoryPath: directoryPath, returnCode: returnCode }, callback);
			},
			requestRenameFile: function(serverConnectionHandlerID, fromChannelID, channelPW, toChannelID, toChannelPW, oldFile, newFile, returnCode, callback) {
				this.sendRequest("requestRenameFile", { serverConnectionHandlerID: serverConnectionHandlerID, fromChannelID: fromChannelID, channelPW: channelPW, toChannelID: toChannelID, toChannelPW: toChannelPW, oldFile: oldFile, newFile: newFile, returnCode: returnCode }, callback);
			},
			requestMessageAdd: function(serverConnectionHandlerID, toClientUID, subject, message, returnCode, callback) {
				this.sendRequest("requestMessageAdd", { serverConnectionHandlerID: serverConnectionHandlerID, toClientUID: toClientUID, subject: subject, message: message, returnCode: returnCode }, callback);
			},
			requestMessageDel: function(serverConnectionHandlerID, messageID, returnCode, callback) {
				this.sendRequest("requestMessageDel", { serverConnectionHandlerID: serverConnectionHandlerID, messageID: messageID, returnCode: returnCode }, callback);
			},
			requestMessageGet: function(serverConnectionHandlerID, messageID, returnCode, callback) {
				this.sendRequest("requestMessageGet", { serverConnectionHandlerID: serverConnectionHandlerID, messageID: messageID, returnCode: returnCode }, callback);
			},
			requestMessageList: function(serverConnectionHandlerID, returnCode, callback) {
				this.sendRequest("requestMessageList", { serverConnectionHandlerID: serverConnectionHandlerID,returnCode: returnCode }, callback);
			},
			requestMessageUpdateFlag: function(serverConnectionHandlerID, messageID, flag, returnCode, callback) {
				this.sendRequest("requestMessageUpdateFlag", { serverConnectionHandlerID: serverConnectionHandlerID, messageID: messageID, flag: flag, returnCode: returnCode }, callback);
			},
			verifyServerPassword: function(serverConnectionHandlerID, serverPassword, returnCode, callback) {
				this.sendRequest("verifyServerPassword", { serverConnectionHandlerID: serverConnectionHandlerID, serverPassword: serverPassword, returnCode: returnCode }, callback);
			},
			verifyChannelPassword: function(serverConnectionHandlerID, channelID, channelPassword, returnCode, callback) {
				this.sendRequest("verifyChannelPassword", { serverConnectionHandlerID: serverConnectionHandlerID, channelID: channelID, channelPassword: channelPassword, returnCode: returnCode }, callback);
			},
			banclient: function(serverConnectionHandlerID, clientID, timeInSeconds, banReason, returnCode, callback) {
				this.sendRequest("banclient", { serverConnectionHandlerID: serverConnectionHandlerID, clientID: clientID, timeInSeconds: timeInSeconds, banReason: banReason, returnCode: returnCode }, callback);
			},
			banadd: function(serverConnectionHandlerID, ipRegExp, nameRegexp, uniqueIdentity, timeInSeconds, banReason, returnCode, callback) {
				this.sendRequest("banadd", { serverConnectionHandlerID: serverConnectionHandlerID, ipRegExp: ipRegExp, nameRegexp: nameRegexp, uniqueIdentity: uniqueIdentity, timeInSeconds: timeInSeconds, banReason: banReason, returnCode: returnCode }, callback);
			},
			banclientdbid: function(serverConnectionHandlerID, clientDBID, timeInSeconds, banReason, returnCode, callback) {
				this.sendRequest("banclientdbid", { serverConnectionHandlerID: serverConnectionHandlerID, clientDBID: clientDBID, timeInSeconds: timeInSeconds, banReason: banReason, returnCode: returnCode }, callback);
			},
			bandel: function(serverConnectionHandlerID, banID, returnCode, callback) {
				this.sendRequest("bandel", { serverConnectionHandlerID: serverConnectionHandlerID, banID: banID, returnCode: returnCode }, callback);
			},
			bandelall: function(serverConnectionHandlerID, returnCode, callback) {
				this.sendRequest("bandelall", { serverConnectionHandlerID: serverConnectionHandlerID, returnCode: returnCode }, callback);
			},
			requestBanList: function(serverConnectionHandlerID, returnCode, callback) {
				this.sendRequest("requestBanList", { serverConnectionHandlerID: serverConnectionHandlerID, returnCode: returnCode }, callback);
			},
			requestComplainAdd: function(serverConnectionHandlerID, targetClientDatabaseID, complainReason, returnCode, callback) {
				this.sendRequest("requestComplainAdd", { serverConnectionHandlerID: serverConnectionHandlerID, targetClientDatabaseID: targetClientDatabaseID, complainReason: complainReason, returnCode: returnCode }, callback);
			},
			requestComplainDel: function(serverConnectionHandlerID, targetClientDatabaseID, fromClientDatabaseID, returnCode, callback) {
				this.sendRequest("requestComplainDel", { serverConnectionHandlerID: serverConnectionHandlerID, targetClientDatabaseID: targetClientDatabaseID, fromClientDatabaseID: fromClientDatabaseID, returnCode: returnCode }, callback);
			},
			requestComplainDelAll: function(serverConnectionHandlerID, targetClientDatabaseID, returnCode, callback) {
				this.sendRequest("requestComplainDelAll", { serverConnectionHandlerID: serverConnectionHandlerID, targetClientDatabaseID: targetClientDatabaseID, returnCode: returnCode }, callback);
			},
			requestComplainList: function(serverConnectionHandlerID, targetClientDatabaseID, returnCode, callback) {
				this.sendRequest("requestComplainList", { serverConnectionHandlerID: serverConnectionHandlerID, targetClientDatabaseID: targetClientDatabaseID, returnCode: returnCode }, callback);
			},
			requestServerGroupList: function(serverConnectionHandlerID, returnCode, callback) {
				this.sendRequest("requestServerGroupList", { serverConnectionHandlerID: serverConnectionHandlerID, returnCode: returnCode }, callback);
			},
			requestServerGroupAdd: function(serverConnectionHandlerID, groupName, groupType, returnCode, callback) {
				this.sendRequest("requestServerGroupAdd", { serverConnectionHandlerID: serverConnectionHandlerID, groupName: groupName, groupType: groupType, returnCode: returnCode }, callback);
			},
			requestServerGroupDel: function(serverConnectionHandlerID, serverGroupID, force, returnCode, callback) {
				this.sendRequest("requestServerGroupDel", { serverConnectionHandlerID: serverConnectionHandlerID, serverGroupID: serverGroupID, force: force, returnCode: returnCode }, callback);
			},
			requestServerGroupAddClient: function(serverConnectionHandlerID, serverGroupID, clientDatabaseID, returnCode, callback) {
				this.sendRequest("requestServerGroupAddClient", { serverConnectionHandlerID: serverConnectionHandlerID, serverGroupID: serverGroupID, clientDatabaseID: clientDatabaseID, returnCode: returnCode }, callback);
			},
			requestServerGroupDelClient: function(serverConnectionHandlerID, serverGroupID, clientDatabaseID, returnCode, callback) {
				this.sendRequest("requestServerGroupDelClient", { serverConnectionHandlerID: serverConnectionHandlerID, serverGroupID: serverGroupID, clientDatabaseID: clientDatabaseID, returnCode: returnCode }, callback);
			},
			requestServerGroupsByClientID: function(serverConnectionHandlerID, clientDatabaseID, returnCode, callback) {
				this.sendRequest("requestServerGroupsByClientID", { serverConnectionHandlerID: serverConnectionHandlerID, clientDatabaseID: clientDatabaseID, returnCode: returnCode }, callback);
			},
			// requestServerGroupAddPerm: function(serverConnectionHandlerID, serverGroupID, continueonerror, permissionIDArray, permissionValueArray, permissionNegatedArray, permissionSkipArray, arraySize, returnCode, callback) {
			//     this.sendRequest("requestServerGroupAddPerm", { serverConnectionHandlerID: serverConnectionHandlerID, serverGroupID: serverGroupID, continueonerror: continueonerror, permissionIDArray: permissionIDArray, permissionValueArray: permissionValueArray, permissionNegatedArray: permissionNegatedArray, permissionSkipArray: permissionSkipArray, arraySize: arraySize, returnCode: returnCode }, callback);
			// },
			// requestServerGroupDelPerm: function(serverConnectionHandlerID, serverGroupID, continueOnError, permissionIDArray, arraySize, returnCode, callback) {
			//     this.sendRequest("requestServerGroupDelPerm", { serverConnectionHandlerID: serverConnectionHandlerID, serverGroupID: serverGroupID, continueOnError: continueOnError, permissionIDArray: permissionIDArray, arraySize: arraySize, returnCode: returnCode }, callback);
			// },
			requestServerGroupPermList: function(serverConnectionHandlerID, serverGroupID, returnCode, callback) {
				this.sendRequest("requestServerGroupPermList", { serverConnectionHandlerID: serverConnectionHandlerID, serverGroupID: serverGroupID, returnCode: returnCode }, callback);
			},
			requestServerGroupClientList: function(serverConnectionHandlerID, serverGroupID, withNames, returnCode, callback) {
				this.sendRequest("requestServerGroupClientList", { serverConnectionHandlerID: serverConnectionHandlerID, serverGroupID: serverGroupID, withNames: withNames, returnCode: returnCode }, callback);
			},
			requestChannelGroupList: function(serverConnectionHandlerID, returnCode, callback) {
				this.sendRequest("requestChannelGroupList", { serverConnectionHandlerID: serverConnectionHandlerID, returnCode: returnCode }, callback);
			},
			requestChannelGroupAdd: function(serverConnectionHandlerID, groupName, groupType, returnCode, callback) {
				this.sendRequest("requestChannelGroupAdd", { serverConnectionHandlerID: serverConnectionHandlerID, groupName: groupName, groupType: groupType, returnCode: returnCode }, callback);
			},
			requestChannelGroupDel: function(serverConnectionHandlerID, channelGroupID, force, returnCode, callback) {
				this.sendRequest("requestChannelGroupDel", { serverConnectionHandlerID: serverConnectionHandlerID, channelGroupID: channelGroupID, force: force, returnCode: returnCode }, callback);
			},
			// requestChannelGroupAddPerm: function(serverConnectionHandlerID, channelGroupID, continueonerror, permissionIDArray, permissionValueArray, arraySize, returnCode, callback) {
			//     this.sendRequest("requestChannelGroupAddPerm", serverConnectionHandlerID: serverConnectionHandlerID, channelGroupID: channelGroupID, continueonerror: continueonerror, permissionIDArray: permissionIDArray, permissionValueArray: permissionValueArray, arraySize: arraySize, returnCode: returnCode }, callback);
			// },
			// requestChannelGroupDelPerm: function(serverConnectionHandlerID, channelGroupID, continueOnError, permissionIDArray, arraySize, returnCode, callback) {
			//     this.sendRequest("requestChannelGroupDelPerm", { serverConnectionHandlerID: serverConnectionHandlerID, channelGroupID: channelGroupID, continueOnError: continueOnError, permissionIDArray: permissionIDArray, arraySize: arraySize, returnCode: returnCode }, callback);
			// },
			requestChannelGroupPermList: function(serverConnectionHandlerID, channelGroupID, returnCode, callback) {
				this.sendRequest("requestChannelGroupPermList", { serverConnectionHandlerID: serverConnectionHandlerID, channelGroupID: channelGroupID, returnCode: returnCode }, callback);
			},
			// requestSetClientChannelGroup: function(serverConnectionHandlerID, channelGroupIDArray, channelIDArray, clientDatabaseIDArray, arraySize, returnCode, callback) {
			//     this.sendRequest("requestSetClientChannelGroup", { serverConnectionHandlerID: serverConnectionHandlerID, channelGroupIDArray: channelGroupIDArray, channelIDArray: channelIDArray, clientDatabaseIDArray: clientDatabaseIDArray, arraySize: arraySize, returnCode: returnCode }, callback);
			// },
			// requestChannelAddPerm: function(serverConnectionHandlerID, channelID, permissionIDArray, permissionValueArray, arraySize, returnCode, callback) {
			//     this.sendRequest("requestChannelAddPerm", { serverConnectionHandlerID: serverConnectionHandlerID, channelID: channelID, permissionIDArray: permissionIDArray, permissionValueArray: permissionValueArray, arraySize: arraySize, returnCode: returnCode }, callback);
			// },
			// requestChannelDelPerm: function(serverConnectionHandlerID, channelID, permissionIDArray, arraySize, returnCode, callback) {
			//     this.sendRequest("requestChannelDelPerm", { serverConnectionHandlerID: serverConnectionHandlerID, channelID: channelID, permissionIDArray: permissionIDArray, arraySize: arraySize, returnCode: returnCode }, callback);
			// },
			requestChannelPermList: function(serverConnectionHandlerID, channelID, returnCode, callback) {
				this.sendRequest("requestChannelPermList", { serverConnectionHandlerID: serverConnectionHandlerID, channelID: channelID, returnCode: returnCode }, callback);
			},
			// requestClientAddPerm: function(serverConnectionHandlerID, clientDatabaseID, permissionIDArray, permissionValueArray, permissionSkipArray, arraySize, returnCode, callback) {
			//     this.sendRequest("requestClientAddPerm", serverConnectionHandlerID: serverConnectionHandlerID, clientDatabaseID: clientDatabaseID, permissionIDArray: permissionIDArray, permissionValueArray: permissionValueArray, permissionSkipArray: permissionSkipArray, arraySize: arraySize, returnCode: returnCode }, callback);
			// },
			// requestClientDelPerm: function(serverConnectionHandlerID, clientDatabaseID, permissionIDArray, arraySize, returnCode, callback) {
			//     this.sendRequest("requestClientDelPerm", { serverConnectionHandlerID: serverConnectionHandlerID, clientDatabaseID: clientDatabaseID, permissionIDArray: permissionIDArray, arraySize: arraySize, returnCode: returnCode }, callback);
			// },
			requestClientPermList: function(serverConnectionHandlerID, clientDatabaseID, returnCode, callback) {
				this.sendRequest("requestClientPermList", { serverConnectionHandlerID: serverConnectionHandlerID, clientDatabaseID: clientDatabaseID, returnCode: returnCode }, callback);
			},
			// requestChannelClientAddPerm: function(serverConnectionHandlerID, channelID, clientDatabaseID, permissionIDArray, permissionValueArray, arraySize, returnCode, callback) {
			//     this.sendRequest("requestChannelClientAddPerm", serverConnectionHandlerID: serverConnectionHandlerID, channelID: channelID, clientDatabaseID: clientDatabaseID, permissionIDArray: permissionIDArray, permissionValueArray: permissionValueArray, arraySize: arraySize, returnCode: returnCode }, callback);
			// },
			// requestChannelClientDelPerm: function(serverConnectionHandlerID, channelID, clientDatabaseID, permissionIDArray, arraySize, returnCode, callback) {
			//     this.sendRequest("requestChannelClientDelPerm", { serverConnectionHandlerID: serverConnectionHandlerID, channelID: channelID, clientDatabaseID: clientDatabaseID, permissionIDArray: permissionIDArray, arraySize: arraySize, returnCode: returnCode }, callback);
			// },
			requestChannelClientPermList: function(serverConnectionHandlerID, channelID, clientDatabaseID, returnCode, callback) {
				this.sendRequest("requestChannelClientPermList", { serverConnectionHandlerID: serverConnectionHandlerID, channelID: channelID, clientDatabaseID: clientDatabaseID, returnCode: returnCode }, callback);
			},
			privilegeKeyUse: function(serverConnectionHandler, tokenKey, returnCode, callback) {
				this.sendRequest("privilegeKeyUse", { serverConnectionHandler: serverConnectionHandler, tokenKey: tokenKey, returnCode: returnCode }, callback);
			},
			requestPermissionList: function(serverConnectionHandler, returnCode, callback) {
				this.sendRequest("requestPermissionList", { serverConnectionHandler: serverConnectionHandler, returnCode: returnCode }, callback);
			},
			requestPermissionOverview: function(serverConnectionHandler, clientDBID, channelID, returnCode, callback) {
				this.sendRequest("requestPermissionOverview", { serverConnectionHandler: serverConnectionHandler, clientDBID: clientDBID, channelID: channelID, returnCode: returnCode }, callback);
			},
			clientPropertyStringToFlag: function(clientPropertyString, callback) {
				this.sendRequest("clientPropertyStringToFlag", { clientPropertyString: clientPropertyString }, callback);
			},
			channelPropertyStringToFlag: function(channelPropertyString, callback) {
				this.sendRequest("channelPropertyStringToFlag", { channelPropertyString: channelPropertyString }, callback);
			},
			serverPropertyStringToFlag: function(serverPropertyString, callback) {
				this.sendRequest("serverPropertyStringToFlag", { serverPropertyString: serverPropertyString }, callback);
			},
			getAppPath: function(callback) {
				this.sendRequest("getAppPath", callback);
			},
			getResourcesPath: function(callback) {
				this.sendRequest("getResourcesPath", callback);
			},
			getConfigPath: function(callback) {
				this.sendRequest("getConfigPath", callback);
			},
			getPluginPath: function(callback) {
				this.sendRequest("getPluginPath", callback);
			},
			getCurrentServerConnectionHandlerID: function(callback) {
				this.sendRequest("getCurrentServerConnectionHandlerID", callback);
			},
			printMessage: function(serverConnectionHandlerID, message, messageTarget, callback) {
				this.sendRequest("printMessage", { serverConnectionHandlerID: serverConnectionHandlerID, message: message, messageTarget: messageTarget }, callback);
			},
			printMessageToCurrentTab: function(message, callback) {
				this.sendRequest("printMessageToCurrentTab", { message: message }, callback);
			},
			urlsToBB: function(text, result, callback) {
				this.sendRequest("urlsToBB", { text: text, result: result }, callback);
			},
			// sendPluginCommand: function(serverConnectionHandlerID, pluginID, command, targetMode, targetIDs, returnCode, callback) {
			//     this.sendRequest("sendPluginCommand", { serverConnectionHandlerID: serverConnectionHandlerID, pluginID: pluginID, command: command, targetMode: targetMode, targetIDs: targetIDs, returnCode: returnCode }, callback);
			// },
			getDirectories: function(path, result, callback) {
				this.sendRequest("getDirectories", { path: path, result: result }, callback);
			},
			getServerConnectInfo: function(serverConnectionHandlerID, callback) {
				this.sendRequest("getServerConnectInfo", { serverConnectionHandlerID: serverConnectionHandlerID }, callback);
			},
			getChannelConnectInfo: function(serverConnectionHandlerID, channelID) {
				this.sendRequest("getServerConnectInfo", { serverConnectionHandlerID: serverConnectionHandlerID, channelID: channelID }, callback);
			},
			createReturnCode: function(pluginID, returnCode, callback) {
				this.sendRequest("createReturnCode", { pluginID: pluginID, returnCode: returnCode }, callback);
			},
			requestInfoUpdate: function(serverConnectionHandlerID, itemType, itemID, callback) {
				this.sendRequest("requestInfoUpdate", { serverConnectionHandlerID: serverConnectionHandlerID, itemType: itemType, itemID: itemID }, callback);
			},
			getServerVersion: function(serverConnectionHandlerID, callback) {
				this.sendRequest("getServerVersion", { serverConnectionHandlerID: serverConnectionHandlerID }, callback);
			},
			isWhispering: function(serverConnectionHandlerID, clientID, callback) {
				this.sendRequest("isWhispering", { serverConnectionHandlerID: serverConnectionHandlerID, clientID: clientID }, callback);
			},
			isReceivingWhisper: function(serverConnectionHandlerID, clientID, callback) {
				this.sendRequest("isReceivingWhisper", { serverConnectionHandlerID: serverConnectionHandlerID, clientID: clientID }, callback);
			},
			getAvatar: function(serverConnectionHandlerID, clientID, callback) {
				this.sendRequest("getAvatar", { serverConnectionHandlerID: serverConnectionHandlerID, clientID: clientID }, callback);
			},
			// setPluginMenuEnabled: function(pluginID, menuID, enabled, callback) {
			//     this.sendRequest("setPluginMenuEnabled", { pluginID: pluginID, menuID: menuID, enabled: enabled }, callback);
			// },
			// showHotkeySetup: function(callback) {
			//     this.sendRequest("showHotkeySetup", callback);
			// },
			// requestHotkeyInputDialog: function(pluginID, keyword, qParentWindow, callback) {
			//     this.sendRequest("requestHotkeyInputDialog", { pluginID: pluginID, keyword: keyword, qParentWindow: qParentWindow }, callback);
			// },
			// getHotkeyFromKeyword: function(pluginID, keywords, hotkeys, arrayLen, hotkeyBufSize, callback) {
			//     this.sendRequest("getHotkeyFromKeyword", { pluginID: pluginID, keywords: keywords, hotkeys: hotkeys, arrayLen: arrayLen, hotkeyBufSize: hotkeyBufSize }, callback);
			// }
			getClientDisplayName: function(serverConnectionHandlerID, clientID, callback) {
				this.sendRequest("getClientDisplayName", { serverConnectionHandlerID: serverConnectionHandlerID, clientID: clientID }, callback);
			},
			// getBookmarkList: function(callback) {
			//     this.sendRequest("getBookmarkList", callback);
			// },
			getProfileList: function(profile, callback) {
				this.sendRequest("getProfileList", { profile: profile }, callback);
			},
			// guiConnect: function(connectTab, serverLabel, serverAddress, serverPassword, nickname, channel, channelPassword, captureProfile, playbackProfile, hotkeyProfile, soundProfile, userIdentity, oneTimeKey, phoneticName, serverConnectionHandlerID, callback) {
			//     this.sendRequest("guiConnect", { connectTab: connectTab, serverLabel: serverLabel, serverAddress: serverAddress, serverPassword: serverPassword, nickname: nickname, channel: channel, channelPassword: channelPassword, captureProfile: captureProfile, playbackProfile: playbackProfile, hotkeyProfile: hotkeyProfile, soundProfile: soundProfile, userIdentity: userIdentity, oneTimeKey: oneTimeKey, phoneticName: phoneticName, serverConnectionHandlerID: serverConnectionHandlerID }, callback);
			// },
			// guiConnectBookmark: function(connectTab, bookmarkuuid, serverConnectionHandlerID, callback) {
			//     this.sendRequest("guiConnectBookmark", { connectTab: connectTab, bookmarkuuid: bookmarkuuid, serverConnectionHandlerID: serverConnectionHandlerID }, callback);
			// },
			// createBookmark: function(bookmarkuuid, serverLabel, serverAddress, serverPassword, nickname, channel, channelPassword, captureProfile, playbackProfile, hotkeyProfile, soundProfile, uniqueUserId, oneTimeKey, phoneticName, callback) {
			//     this.sendRequest("createBookmark", { bookmarkuuid: bookmarkuuid, serverLabel: serverLabel, serverAddress: serverAddress, serverPassword: serverPassword, nickname: nickname, channel: channel, channelPassword: channelPassword, captureProfile: captureProfile, playbackProfile: playbackProfile, hotkeyProfile: hotkeyProfile, soundProfile: soundProfile, uniqueUserId: uniqueUserId, oneTimeKey: oneTimeKey, phoneticName: phoneticName }, callback);
			// },
			getPermissionIDByName: function(serverConnectionHandlerID, permissionName, callback) {
				this.sendRequest("getPermissionIDByName", { serverConnectionHandlerID: serverConnectionHandlerID, permissionName: permissionName }, callback);
			},
			getClientNeededPermission: function(serverConnectionHandlerID, permissionName, callback) {
				this.sendRequest("getClientNeededPermission", { serverConnectionHandlerID: serverConnectionHandlerID, permissionName: permissionName }, callback);
			},

			getIdentity: function(profileName, callback) {
				this.sendRequest("getIdentity", { profileName: profileName },  callback);
			}

			}
		for (var attribute in default_handler) { handler[attribute] = default_handler[attribute]; }
		return initializeWebsocket(handler, options);
	}

});