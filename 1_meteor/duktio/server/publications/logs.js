// Publications related to Logs collection

// LOGS SHOW
// -------------------------------------------------------
Meteor.publish('lastlogs', function() {
	  // TODO: security
	  // check(this.userId, String);  // Meteor.Collection.ObjectID);
    // console.log("")

    // return false;

    return Lastlogs.find({userId: this.userId});

		// https://github.com/meteorhacks/meteor-aggregate/issues/8
		// http://ask.ttwait.com/que/26861070
    // return Logs.aggregate([{$sort: {createdAt: -1}},
				// 							     {$group: {
				// 						           _id: "$ref_webhook",
				// 						           lastresult: { $last: "$createdAt" }
				// 							       }
				// 							     }])
});