// ***************************************************************
// USER PROFILE
// ***************************************************************

Router.map(function() {

  // DUKS INDEX
  // -------------------------------------------------------
  this.route('profile', {
    template: 'profile',
    path: '/profile/:_id',
    waitOn: function () {
        return Meteor.subscribe("userProfile", this.params._id);
    },
    data: function () {
        var id = this.params._id;
        console.log(id);
        return Meteor.users.findOne({
            _id: id
        });
    }
  });
});
