// ***************************************************************
// DUKS
// ***************************************************************

Router.map(function() {

  // DUKS INDEX
  // -------------------------------------------------------
  this.route('duksIndex', {
    template: 'duksIndex',
    path: '/duks',
    onBeforeAction: function () {
      AccountsEntry.signInRequired(this);
      this.next();
    },
    waitOn: function () {
        return [  Meteor.subscribe('lastlogs'),
                  Meteor.subscribe('duks'),
                  Meteor.subscribe('edges')
                ];
    },
    data: function () {
      return {
        duks: Duks.find({}, {sort: {createdAt: -1}})  // logs: Logs.find({}, {sort: {createdAt: -1}});
      }
    },
    onStop: function () {
      if (Meteor.user()) {
        console.log("> In router.duks onStop");
        if (typeof duks_observe_handle !== "undefined") {duks_observe_handle.stop()};
        if (typeof edges_observe_handle !== "undefined") {edges_observe_handle.stop()};
        console.log("< Out router.duks onStop");
      };
    }
  });

  // DUK NEW
  // -------------------------------------------------------
  this.route('dukNew', {
    template: 'dukNew',
    path: '/duks/new'
  });

  // DUK SHOW
  // -------------------------------------------------------
  this.route('dukShow', {
    template: 'dukShow',
    path: '/duks/:_id',
    waitOn: function () {
      return Meteor.subscribe('duk', this.params._id);
    },
    data: function () {
      return Duks.findOne(this.params._id);
    }
  });

  // DUK EDIT
  // -------------------------------------------------------
  this.route('dukEdit', {
    template: 'dukEdit',
    path: '/duks/:_id/edit',
    waitOn: function () {
      return Meteor.subscribe('duk', this.params._id);
    },
    data: function () {
      return Duks.findOne(this.params._id);
    }
  });

});
