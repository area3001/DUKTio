// ***************************************************************
// DUKS
// ***************************************************************

Router.map(function() {

  // DUKS INDEX
  // -------------------------------------------------------
  this.route('duksIndex', {
    template: 'duksIndex',
    path: '/duks',
    waitOn: function () {
      // TODO: can probably do this with promises
        return [  Meteor.subscribe('logs'),
                  Meteor.subscribe('duks', function onReady(){
                    // Need to wait for the nodes, before drawing the edges
                    Meteor.subscribe('edges')
                  }),
                ];
    },
    data: function () {
      return {
        duks: Duks.find({}, {sort: {createdAt: -1}}),  // logs: Logs.find({}, {sort: {createdAt: -1}});
      }
    },
    onStop: function () {
        console.log("> In router.duks onStop");
        if (duks_observe_handle) duks_observe_handle.stop();
        if (edges_observe_handle) edges_observe_handle.stop();
        console.log("< Out router.duks onStop");
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
