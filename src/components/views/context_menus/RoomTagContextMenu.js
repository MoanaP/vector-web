/*
Copyright 2015, 2016 OpenMarket Ltd

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

var q = require("q");
var React = require('react');
var classNames = require('classnames');
var MatrixClientPeg = require('matrix-react-sdk/lib/MatrixClientPeg');
var dis = require('matrix-react-sdk/lib/dispatcher');

module.exports = React.createClass({
    displayName: 'RoomTagContextMenu',

    propTypes: {
        room: React.PropTypes.object.isRequired,
        /* callback called when the menu is dismissed */
        onFinished: React.PropTypes.func,
    },

    getInitialState: function() {
        return {
            isFavourite: this.props.room.tags.hasOwnProperty("m.favourite"),
            isLowPriority: this.props.room.tags.hasOwnProperty("m.lowpriority"),
        };
    },

    _toggleTag: function(tagNameOn, tagNameOff) {
        var self = this;
        const roomId = this.props.room.roomId;
        var cli = MatrixClientPeg.get();
        if (!cli.isGuest()) {
            q.delay(500).then(function() {
                if (tagNameOff !== null && tagNameOff !== undefined) {
                    cli.deleteRoomTag(roomId, tagNameOff).finally(function() {
                        // Close the context menu
                        if (self.props.onFinished) {
                            self.props.onFinished();
                        };
                    }).fail(function(err) {
                        var ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
                        Modal.createDialog(ErrorDialog, {
                            title: "Failed to remove tag " + tagNameOff + " from room",
                            description: err.toString()
                        });
                    });
                }

                if (tagNameOn !== null && tagNameOn !== undefined) {
                    // If the tag ordering meta data is required, it is added by
                    // the RoomSubList when it sorts its rooms
                    cli.setRoomTag(roomId, tagNameOn, {}).finally(function() {
                        // Close the context menu
                        if (self.props.onFinished) {
                            self.props.onFinished();
                        };
                    }).fail(function(err) {
                        var ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
                        Modal.createDialog(ErrorDialog, {
                            title: "Failed to add tag " + tagNameOn + " to room",
                            description: err.toString()
                        });
                    });
                }
            });
        }
    },

    _onClickFavourite: function() {
        // Tag room as 'Favourite'
        if (!this.state.isFavourite && this.state.isLowPriority) {
            this.setState({
                isFavourite: true,
                isLowPriority: false,
            });
            this._toggleTag("m.favourite", "m.lowpriority");
        } else if (this.state.isFavourite) {
            this.setState({isFavourite: false});
            this._toggleTag(null, "m.favourite");
        } else if (!this.state.isFavourite) {
            this.setState({isFavourite: true});
            this._toggleTag("m.favourite");
        }
    },

    _onClickLowPriority: function() {
        // Tag room as 'Low Priority'
        if (!this.state.isLowPriority && this.state.isFavourite) {
            this.setState({
                isFavourite: false,
                isLowPriority: true,
            });
            this._toggleTag("m.lowpriority", "m.favourite");
        } else if (this.state.isLowPriority) {
            this.setState({isLowPriority: false});
            this._toggleTag(null, "m.lowpriority");
        } else if (!this.state.isLowPriority) {
            this.setState({isLowPriority: true});
            this._toggleTag("m.lowpriority");
        }
    },

    _onClickLeave: function() {
        // Leave room
        dis.dispatch({
            action: 'leave_room',
            room_id: this.props.room.roomId,
        });

        // Close the context menu
        if (this.props.onFinished) {
            this.props.onFinished();
        };
    },

    _onClickForget: function() {
        // FIXME: duplicated with RoomSettings (and dead code in RoomView)
        MatrixClientPeg.get().forget(this.props.room.roomId).done(function() {
            dis.dispatch({ action: 'view_next_room' });
        }, function(err) {
            var errCode = err.errcode || "unknown error code";
            var ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
            Modal.createDialog(ErrorDialog, {
                title: "Error",
                description: `Failed to forget room (${errCode})`
            });
        });

        // Close the context menu
        if (this.props.onFinished) {
            this.props.onFinished();
        };
    },

    render: function() {
        var myUserId = MatrixClientPeg.get().credentials.userId;
        var myMember = this.props.room.getMember(myUserId);

        var favouriteClasses = classNames({
            'mx_RoomTagContextMenu_field': true,
            'mx_RoomTagContextMenu_fieldSet': this.state.isFavourite,
            'mx_RoomTagContextMenu_fieldDisabled': false,
        });

        var lowPriorityClasses = classNames({
            'mx_RoomTagContextMenu_field': true,
            'mx_RoomTagContextMenu_fieldSet': this.state.isLowPriority,
            'mx_RoomTagContextMenu_fieldDisabled': false,
        });

        var leaveClasses = classNames({
            'mx_RoomTagContextMenu_field': true,
            'mx_RoomTagContextMenu_fieldSet': false,
            'mx_RoomTagContextMenu_fieldDisabled': false,
        });

        if (myMember && myMember.membership === "leave") {
            return (
                <div>
                    <div className={ leaveClasses } onClick={ this._onClickForget } >
                        <img className="mx_RoomTagContextMenu_icon" src="img/icon_context_delete.svg" width="15" height="15" />
                        Forget
                    </div>
                </div>
            );
        }

        return (
            <div>
                <div className={ favouriteClasses } onClick={this._onClickFavourite} >
                    <img className="mx_RoomTagContextMenu_icon" src="img/icon_context_fave.svg" width="15" height="15" />
                    <img className="mx_RoomTagContextMenu_icon_set" src="img/icon_context_fave_on.svg" width="15" height="15" />
                    Favourite
                </div>
                <div className={ lowPriorityClasses } onClick={this._onClickLowPriority} >
                    <img className="mx_RoomTagContextMenu_icon" src="img/icon_context_low.svg" width="15" height="15" />
                    <img className="mx_RoomTagContextMenu_icon_set" src="img/icon_context_low_on.svg" width="15" height="15" />
                    Low Priority
                </div>
                <hr className="mx_RoomTagContextMenu_separator" />
                <div className={ leaveClasses } onClick={(myMember && myMember.membership === "join") ? this._onClickLeave : null} >
                    <img className="mx_RoomTagContextMenu_icon" src="img/icon_context_delete.svg" width="15" height="15" />
                    Leave
                </div>
            </div>
        );
    }
});
