/*
Copyright 2015 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

'use strict';

// should be atomised
var Loader = require("react-loader");

var mxCliPeg = require("../../MatrixClientPeg");

var dis = require("../../dispatcher");

module.exports = {
    getInitialState: function() {
        return {
            logged_in: !!(mxCliPeg.get() && mxCliPeg.get().credentials),
            ready: false
        };
    },

    componentDidMount: function() {
        this.dispatcherRef = dis.register(this.onAction);
        if (this.state.logged_in) {
            this.startMatrixClient();
        }
        this.focusComposer = false;
        document.addEventListener("keydown", this.onKeyDown);
    },

    componentWillUnmount: function() {
        dis.unregister(this.dispatcherRef);
        document.removeEventListener("keydown", this.onKeyDown);
    },

    componentDidUpdate: function() {
        if (this.focusComposer) {
            dis.dispatch({action: 'focus_composer'});
            this.focusComposer = false;
        }
    },

    onAction: function(payload) {
        var roomIndexDelta = 1;

        switch (payload.action) {
            case 'logout':
                this.setState({
                    logged_in: false,
                    ready: false
                });
                mxCliPeg.get().removeAllListeners();
                mxCliPeg.replace(null);
                break;
            case 'view_room':
                this.setState({
                    currentRoom: payload.room_id
                });
                this.focusComposer = true;
                break;
            case 'view_prev_room':
                roomIndexDelta = -1;
            case 'view_next_room':
                var allRooms = mxCliPeg.get().getRooms();
                var roomIndex = -1;
                for (var i = 0; i < allRooms.length; ++i) {
                    if (allRooms[i].roomId == this.state.currentRoom) {
                        roomIndex = i;
                        break;
                    }
                }
                roomIndex = (roomIndex + roomIndexDelta) % allRooms.length;
                this.setState({
                    currentRoom: allRooms[roomIndex].roomId
                });
                break;
        }
    },

    onLoggedIn: function() {
        this.setState({logged_in: true});
        this.startMatrixClient();
    },

    startMatrixClient: function() {
        var cli = mxCliPeg.get();
        var that = this;
        cli.on('syncComplete', function() {
            var firstRoom = null;
            if (cli.getRooms() && cli.getRooms().length) {
                firstRoom = cli.getRooms()[0].roomId;
            }
            that.setState({ready: true, currentRoom: firstRoom});
            dis.dispatch({action: 'focus_composer'});
        });
        cli.startClient();
    },

    onKeyDown: function(ev) {
        if (ev.altKey) {
            switch (ev.keyCode) {
                case 38:
                    dis.dispatch({action: 'view_prev_room'});
                    ev.stopPropagation();
                    break;
                case 40:
                    dis.dispatch({action: 'view_next_room'});
                    ev.stopPropagation();
                    break;
            }
        }
    }
};
