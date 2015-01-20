Meteor.startup(function () {
  // Set standard behavior for the notifications
  // https://github.com/gfk-ba/meteor-notifications
  _.extend(Notifications.defaultOptions, {
      timeout: 6000
  });
  
});
