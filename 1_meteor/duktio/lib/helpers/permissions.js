// Permissions shared with client and server

// If the user is logged in, give permission
canCreateItem = function (userId) {
  if (!userId) {
    throw new Meteor.Error("not-authorized");
  }
  return true;
}

// If the user owns the item, give permission
canEditItem = function (userId, item) {
	if (!userId) {
    throw new Meteor.Error("not-authorized");
  }
  return userId === item.userId;
}

// If the user owns the item, give permission
canRemoveItem = function (userId, item) {
  if (!userId) {
    throw new Meteor.Error("not-authorized");
  }
  return userId === item.userId;
}

// Checks whether selected user or current user is admin (with the Roles package)
isAdmin = function (user) {
  user = (typeof user === 'undefined') ? Meteor.user() : user;
  return !!user && !!Roles.userIsInRole(user, ['admin']);
}
