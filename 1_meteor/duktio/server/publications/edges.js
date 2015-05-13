// Publications related to Edges collection

// EDGES SHOW
// -------------------------------------------------------
Meteor.publish('edges', function() {
	  // TODO: security
	  // check(this.userId, String);  // Meteor.Collection.ObjectID);

    return Edges.find({userId: this.userId});
});
