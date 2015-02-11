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
    optional: true
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
    denyInsert: true,
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
    // Important server-side check for security and data integrity
    check(doc, DukSchema);
    
    Duks.insert({
      userId: Meteor.userId(),
      authorId: Meteor.userId(),
      name: doc.name,
      subdomain: doc.subdomain,
      pathname: doc.pathname,
      code: doc.code,
      createdAt: new Date(),
      enabled: true
    });
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
      // subdomain: "",
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
    duk_to_save = Duks.findOne({_id: doc._id, userId: Meteor.userId()});
    var old_duk_name = duk_to_save.name;

    if (duk_to_save) {
      console.log("Saving your Dukt");

      var values_to_update = {
          name:doc.name, 
          subdomain:doc.subdomain,
          pathname: doc.pathname,
          code: doc.code,
          graph: doc.graph,
          input_ports: doc.input_ports,
          output_ports: doc.output_ports,
        };

      // call the mongo update
      Duks.update(
        duk_to_save._id, {$set: 
          values_to_update
        }
      )

      // if doc.name was updated, we need to update the edges collection too
      if (old_duk_name !== doc.name) {
        // Update any endpoints in edges that reference this node
        var old_duk_name_reg_ex =  '^' + doc.subdomain + "\\." + old_duk_name + "\\.";
        cursor = Edges.find({ endpoints: { $regex: old_duk_name_reg_ex} });
        cursor.forEach(function(edge_to_update) { 
          var old_endpoints = edge_to_update.endpoints;
          var new_endpoints = old_endpoints.map(function(x){
              return x.replace(doc.subdomain + "." + old_duk_name + ".", doc.subdomain + "." + doc.name + ".");
          });
          Edges.update({_id: edge_to_update._id}, {$set: {endpoints: new_endpoints}});
        });

        // Update any edges that reference this node
        var cursor = Edges.find({ _id: { $regex: old_duk_name_reg_ex} });
        cursor.forEach(function(edge_to_update) {
          var old_edge_id = edge_to_update._id;
          var new_edge_id = old_edge_id.replace(doc.subdomain + "." + old_duk_name + ".", doc.subdomain + "." + doc.name + ".");
          Edges.remove({_id: old_edge_id});
          Edges.insert({_id: new_edge_id, endpoints: edge_to_update.endpoints});
        });

      }



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
  // toggle_enable: function (DukId, toggle_enabled) {
  //   var Duk = Duks.findOne(DukId);
  //   if (Duk.private && Duk.owner !== Meteor.userId()) {
  //     throw new Meteor.Error("not-authorized");
  //   }
  //   Duks.update(DukId, { $set: { enabled: toggle_enabled} });
  // },
});