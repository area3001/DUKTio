// Publications related to Edges collection

// EDGES SHOW
// -------------------------------------------------------
Meteor.publish('edges', function() {
	  // TODO: security
	  // check(this.userId, String);  // Meteor.Collection.ObjectID);
    // console.log("Publishing Edges to user " + this.userId);
    // console.log(Edges.find({userId: this.userId}).fetch());
    return Edges.find({userId: this.userId});
});
