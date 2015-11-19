// A sample collection
SimpleSchema.debug = true

Duks = new Meteor.Collection('duks');

IdPresentSchema = new SimpleSchema({
  _id: {
    type: String,
    max: 100,
    optional: false,
  }
})

PositionSchema = new SimpleSchema({
  x: {
    type: Number,
    optional: true
  },
  y: {
    type: Number,
    optional: true
  },
});

GraphSchema = new SimpleSchema({
  position: {
    type: PositionSchema,
    optional: true
  },
  z: {
    type: Number,
    optional: true
  }
});

DukSchema = new SimpleSchema({
  _id: {
    type: String,
    max: 100,
    optional: true,
  },
  name: {
    type: String,
    label: "Name",
    max: 100,
    optional: false
  },
  subdomain: {
    type: String,
    label: "Subdomain",
    max: 50,
    optional: true
  },
  pathname: {
    type: String,
    label: "Path",
    max: 100,
    optional: true
  },
  code: {
    type: String,
    label: "Code",
    max: 10000,
    optional: true,
    autoform: {
      afFieldInput: {
        type: 'af_codemirror',
        class: 'editor', // optional
        valueIn: "Hi from schema thingy"
      }
    }
  },
  enabled: {
    type: Boolean,
    label: "Enabled",
    max: 10000,
    optional: true
  },
  userId: {
    type: String,
    label: "userId",
    max: 10000,
    optional: true
  },
  authorId: {
    type: String,
    label: "authorId",
    max: 10000,
    optional: true
  },
  createdAt: {
    type: Date,
    optional: true,
    denyUpdate: true,
    autoValue: function() {
      if (this.isInsert) {
        return new Date();
      }
    }
  },
  updatedAt: {
    type: Date,
    optional: true,
    denyInsert: false,
    autoValue: function() {
      if (this.isUpdate) {
        return new Date();
      }
    },
  },
  graph: {
    type: GraphSchema,
    optional: true
  },
  input_ports: {
    type: Array,
    optional: true,
    minCount: 0,
    maxCount: 4
  },
  "input_ports.$": {
    type: String,
    optional: true
  },
  output_ports: {
    type: Array,
    optional: true,
    minCount: 0,
    maxCount: 4
  },
  "output_ports.$": {
    type: String,
    optional: true
  }
});

// Must remember to attach the schema to the collection
Duks.attachSchema(DukSchema);

// Custom validation messages with SimpleSchema. Remove if not needed
Duks.simpleSchema().messages({
  required: "[label] is required",
  minString: "[label] must be at least [min] characters",
  maxString: "[label] cannot exceed [max] characters",
  minNumber: "[label] must be at least [min]",
  maxNumber: "[label] cannot exceed [max]",
  minDate: "[label] must be on or before [min]",
  maxDate: "[label] cannot be after [max]",
  minCount: "You must specify at least [minCount] values",
  maxCount: "You cannot specify more than [maxCount] values",
  noDecimal: "[label] must be an integer",
  notAllowed: "[value] is not an allowed value",
  expectedString: "[label] must be a string",
  expectedNumber: "[label] must be a number",
  expectedBoolean: "[label] must be a boolean",
  expectedArray: "[label] must be an array",
  expectedObject: "[label] must be an object",
  expectedConstructor: "[label] must be a [type]",
  regEx: [
  {msg: "[label] failed regular expression validation"},
  {exp: SimpleSchema.RegEx.Email, msg: "[label] must be a valid e-mail address"},
  {exp: SimpleSchema.RegEx.WeakEmail, msg: "[label] must be a valid e-mail address"},
  {exp: SimpleSchema.RegEx.Domain, msg: "[label] must be a valid domain"},
  {exp: SimpleSchema.RegEx.WeakDomain, msg: "[label] must be a valid domain"},
  {exp: SimpleSchema.RegEx.IP, msg: "[label] must be a valid IPv4 or IPv6 address"},
  {exp: SimpleSchema.RegEx.IPv4, msg: "[label] must be a valid IPv4 address"},
  {exp: SimpleSchema.RegEx.IPv6, msg: "[label] must be a valid IPv6 address"},
  {exp: SimpleSchema.RegEx.Url, msg: "[label] must be a valid URL"},
  {exp: SimpleSchema.RegEx.Id, msg: "[label] must be a valid alphanumeric ID"}
  ],
  keyNotInSchema: "[label] is not allowed by the schema"
});

// Allow and deny rules
Duks.allow({
  insert: function (userId, duk) {
    if (!userId) {
      throw new Meteor.Error("not-authorized");
    }
    return true;
  },
  update: function (userId, duk, fields, modifier) {
    if (userId == duk.owner) {
      throw new Meteor.Error("not-authorized");
    }
    return true;
  },
  remove: function (userId, duk) {
    if (userId == duk.owner) {
      throw new Meteor.Error("not-authorized");
    }
    return true;
  }
});

// Meteor methods related to collection
Meteor.methods({
  addDuk: function (doc) {
    // TODO: check security (call clean or cleanschema)

    if (! Meteor.userId()) {
      Notifications.error('Authorization Error', 'Please login to create a Duk');
      throw new Meteor.Error("not-authorized");
    }

    doc_to_insert = {
      userId: Meteor.userId(),
      authorId: Meteor.userId(),
      name: doc.name,
      subdomain: doc.subdomain,
      pathname: doc.pathname,
      code: doc.code,
      createdAt: new Date(),
      enabled: true,
      graph: doc.graph
    };
    console.log(doc_to_insert);

    // check for schema and insert
    check(doc_to_insert, DukSchema);
    Duks.insert(doc_to_insert);
  },
  addEmptyDuk: function (new_title) {
    // TODO: check security (call clean or cleanschema)

    if (! Meteor.userId()) {
      Notifications.error('Authorization Error', 'Please login to create a Duk');
      throw new Meteor.Error("not-authorized");
    }

    Duks.insert({
      userId: Meteor.userId(),
      authorId: Meteor.userId(),
      name: new_title,
      subdomain: Meteor.user().profile.subdomain,
      // pathname: "",
      // code: doc.code,
      createdAt: new Date(),
      enabled: true
    });
  },
  saveDuk: function (doc) {

    // TODO: check security (call clean or cleanschema)
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    //overwrite the user's subdomain on the duk
    doc.subdomain = Meteor.user().profile.subdomain;

    // Important server-side check for security and data integrity
    // check(doc, DukSchema);
    check({"_id": doc._id}, IdPresentSchema);

    // TODO: check if the name of the duk you want to save is unique (otherwise saving over other duk)
    var duk_to_save = Duks.findOne({_id: doc._id, userId: Meteor.userId()});

    if (duk_to_save) {
      console.log("Saving existing Dukt");

      var values_to_update = {
          name: doc.name,
          subdomain: doc.subdomain,
          pathname: doc.pathname || "",
          code: doc.code,
          graph: doc.graph,
          input_ports: doc.input_ports || [],
          output_ports: doc.output_ports || [],
        };

      console.log(values_to_update);

      // call the mongo update, $set makes sure it isn't just replaced but updated
      Duks.update(
        duk_to_save._id, {$set:
          values_to_update
        }
      )
    } else {
      Meteor.call("addDuk", doc);
    }
  },
  deleteDuk: function (DukId) {
    console.log("in meteor.methods.deleteDuk");
    var Duk = Duks.findOne(DukId);
    if (Duk.owner !== Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }
    Duks.remove(DukId);
  },
  saveGraphToServer: function (graphInJSON) {
    // graphInJSON should look like;
    // [
    // {
    //   "position": {
    //     "x": 303,
    //     "y": 47
    //   },
    //   "type": "devs.Model",
    //   "inPorts": [
    //     "greeting"
    //   ],
    //   "outPorts": [
    //     "test"
    //   ],
    //   "angle": 0,
    //   "z": 3,
    //   "id": "dbf523da-da3a-4a0a-88c9-9fedfdfd72ac",
    //   "orig": {
    //     "db_orig": {
    //       "authorId": "PfugxK9Bpnof6w2fB",
    //       "code": "local data = {hi = message.msg.query.hi}\nsend_out(\"test\", data)\nreturn \"ok\"",
    //       "createdAt": "2015-01-08T20:09:51.007Z",
    //       "enabled": true,
    //       "graph": {
    //         "position": {
    //           "x": 303,
    //           "y": 47
    //         },
    //         "z": 3
    //       },
    //       "inputPorts": [
    //         "MyGreatPort"
    //       ],
    //       "name": "greetingnode",
    //       "output_ports": [
    //         "test"
    //       ],
    //       "pathname": "greeting",
    //       "subdomain": "paularmand",
    //       "updatedAt": "2015-02-11T22:29:53.051Z",
    //       "userId": "PfugxK9Bpnof6w2fB",
    //       "_id": "S5cXzy7mgTfBQ4tPs"
    //     },
    //     "name": "greetingnode",
    //     "subdomain": "paularmand",
    //     "pathname": "greeting",
    //     "output_ports": [
    //       "test"
    //     ],
    //     "position": {
    //       "x": 303,
    //       "y": 47
    //     },
    //     "z": 3
    //   },
    //   "attrs": {
    //     "rect": {
    //       "fill": "#559ce9"
    //     },
    //     ".inPorts circle": {
    //       "fill": "black",
    //       "type": "no-input"
    //     },
    //     ".delete-node-circle": {
    //       "graph_node_id": "graph_node_greetingnode"
    //     },
    //     "text": {
    //       "fill": "white",
    //       "text": "greetingnode",
    //       "font-size": 14
    //     },
    //     ".port-label": {
    //       "fill": "black",
    //       "font-size": 16,
    //       "dy": "-7"
    //     },
    //     ".inPorts>.port0>.port-label": {
    //       "text": "greeting"
    //     },
    //     ".inPorts>.port0>.port-body": {
    //       "port": {
    //         "id": "greeting",
    //         "type": "in"
    //       }
    //     },
    //     ".inPorts>.port0": {
    //       "ref": ".body",
    //       "ref-y": 0.5
    //     },
    //     ".outPorts>.port0>.port-label": {
    //       "text": "test"
    //     },
    //     ".outPorts>.port0>.port-body": {
    //       "port": {
    //         "id": "test",
    //         "type": "out"
    //       }
    //     },
    //     ".outPorts>.port0": {
    //       "ref": ".body",
    //       "ref-y": 0.5,
    //       "ref-dx": 0
    //     }
    //   }
    // },
    // {
    //   "type": "link",
    //   "source": {
    //     "id": "graph_node_greetingnode",
    //     "port": "test"
    //   },
    //   "target": {
    //     "id": "graph_node_undefined",
    //     "port": "3"
    //   },
    //   "id": "87b52520-cefa-4cff-9b5a-552ab2c639e2",
    //   "orig": {
    //     "id": "paularmand.greetingnode.out.test",
    //     "target": "undefined"
    //   },
    //   "prev_link_source": {
    //     "id": "graph_node_greetingnode"
    //   },
    //   "prev_link_target": {
    //     "id": "graph_node_undefined"
    //   },
    //   "z": 15,
    //   "attrs": {}
    // }
    // ]

    console.log("in meteor.methods.saveGraphToServer");

    // delete all edges in the subdomain
    var subdomain_regexp = '^' + Meteor.user().profile.subdomain + "\..*$";
    Edges.remove({ "_id": { $regex: subdomain_regexp} })

    // delete all nodes in this subdomain
    // Duks.remove({ "subdomain": Meteor.user().profile.subdomain} );

    // loop over all the cells and store the nodes
    var nr_cells = graphInJSON.length;
    for (var ii = 0; ii < nr_cells; ii++) {
        cell = graphInJSON[ii];
        // Store the nodes (meaning == dev.Model type)
        if (cell["type"] == "devs.Model") {
            // transform the json
            node_to_add =
              { "_id" : cell.orig.db_orig._id,
                "authorId" : cell.orig.db_orig.authorId,
                "code" : cell.orig.db_orig.code,
                "createdAt" : cell.orig.db_orig.createdAt,
                "enabled" : true,
                "graph" : { "position" : { "x" : cell.position.x, "y" : cell.position.y }, "z" : cell.z },
                "pathname" : cell.orig.pathname,  // ["greeting", ... ],
                "input_ports" : cell.orig.input_ports,  // ["greeting", ... ],
                "output_ports" : cell.orig.output_ports,  // ["myoutput", ... ],
                "name" : cell.orig.db_orig.name,
                "subdomain" : Meteor.user().profile.subdomain,
                "updatedAt" : new Date(),
                "userId" : Meteor.userId()
              }
            // save the node
            Meteor.call("saveDuk", node_to_add);
        }
    }

    // loop over all the cells and store the edges
    var nr_cells = graphInJSON.length;
    for (var ii = 0; ii < nr_cells; ii++) {
        cell = graphInJSON[ii];
        // Store the nodes (meaning == link type)
        if (cell["type"] == "link") {
            // transform the json
            var link_from =  Meteor.user().profile.subdomain + "." + cell.source.id.substring('graph_node_'.length) + ".out." + cell.source.port;
            var link_to =  Meteor.user().profile.subdomain + "." + cell.target.id.substring('graph_node_'.length) + ".in." + cell.target.port;
            link_to_save =
              { "source" : link_from,
                "target" : link_to
              }

            // save the node
            Meteor.call("addEdge", link_to_save);
        }
    }
  }
});
