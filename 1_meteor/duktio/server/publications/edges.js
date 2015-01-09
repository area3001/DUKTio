// Publications related to Edges collection

// EDGES SHOW
// -------------------------------------------------------
Meteor.publish('edges', function() {
	  // TODO: security
	  // check(this.userId, String);  // Meteor.Collection.ObjectID);
    // console.log("")
    // TODO: need to add the userid to the link
    return Edges.find();
     //userId: this.userId
});
