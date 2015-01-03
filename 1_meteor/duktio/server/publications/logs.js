// Publications related to Logs collection

// LOGS SHOW
// -------------------------------------------------------
Meteor.publish('logs', function() {
	  // TODO: security
	  // check(this.userId, String);  // Meteor.Collection.ObjectID);
    // console.log("")
    return Logs.find({
     userId: this.userId
    });
});