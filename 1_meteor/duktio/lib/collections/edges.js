Edges = new Meteor.Collection('edges');

// Allow and deny rules
Edges.allow({
  insert: function (userId, edge) {
    if (!userId) {
      throw new Meteor.Error("not-authorized");
    }
    return true;
  },
  update: function (userId, edge, fields, modifier) {
    if (userId == edge.owner) {
      throw new Meteor.Error("not-authorized");
    }
    return true;
  },
  remove: function (userId, edge) {
    if (userId == edge.owner) {
      throw new Meteor.Error("not-authorized");
    }
    return true;
  }
});

// Meteor methods related to collection
Meteor.methods({
  addEdge: function (doc) {
    console.log("In addEdge")
    // TODO: check security (call clean or cleanschema)

    if (! Meteor.userId()) {
      Notifications.error('Authorization Error', 'Please login to create a Link');
      throw new Meteor.Error("not-authorized");
    }
    // Important server-side check for security and data integrity
    // check(doc, DukSchema);

    // If the edge does not exist create it
    var edge_exists = Edges.findOne({_id: doc.source});
    if (!edge_exists) {
      Edges.insert({
        _id: doc.source,
        endpoints: [doc.target]
      });
    } else {
      // If the edge (source) already exists, check if this link already exists
      var link_exists = Edges.findOne({_id: doc.source, endpoints: doc.target});
      if (!link_exists) {
        // Add the target as endpoint to the source edge
        Edges.update(
          {_id: doc.source},
          {$push: {endpoints: doc.target}}
        );
      };
    };
  },
  saveEdge: function (link_to_delete, link_to_add) {
    // TODO: check security (call clean or cleanschema)
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    // TODO: Important server-side check for security and data integrity
    edge_to_delete = Duks.findOne({_id: link_to_delete.source, userId: Meteor.userId()});

    // TODO: take edge out

    // TODO: put edge in

  },
  deleteEdge: function (link_to_delete) {
    console.log("In meteor.methods.deleteEdge");
    console.log(link_to_delete);
    var edge_to_delete = Edges.findOne({_id: link_to_delete.source});  //TODO: need to add userid
    console.log(edge_to_delete);
    if (edge_to_delete) {
      Edges.update(
        {_id: link_to_delete.source},
        {$pull: {endpoints: {_id: link_to_delete.target}}},
        {multi: true}
      );
    };
  },
});
