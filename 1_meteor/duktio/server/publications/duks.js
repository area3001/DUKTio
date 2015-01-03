// Publications related to Duks collection

// DUKS INDEX
// -------------------------------------------------------
Meteor.publish('duks', function() {
	  // TODO: security
		// check(this.userId, String);  // Meteor.Collection.ObjectID);
    return Duks.find({userId: this.userId});
});

// DUKS SHOW
// -------------------------------------------------------
Meteor.publish('duk', function(id) {
	  // TODO: security
	  // check(this.userId, String);  // Meteor.Collection.ObjectID);
    // console.log("")
    return Duks.find({
     // owner: this.userId,
     _id: id
    });
});
