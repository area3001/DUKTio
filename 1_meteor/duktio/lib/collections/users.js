// Already defined
// Users = new Meteor.Collection('users');


UserCountrySchema = new SimpleSchema({
    name: {
        type: String
    },
    code: {
        type: String,
        regEx: /^[A-Z]{2}$/
    }
});

UserProfileSchema = new SimpleSchema({
    firstName: {
        type: String,
        regEx: /^[a-zA-Z-]{2,25}$/,
        optional: true
    },
    lastName: {
        type: String,
        regEx: /^[a-zA-Z]{2,25}$/,
        optional: true
    },
    birthday: {
        type: Date,
        optional: true
    },
    gender: {
        type: String,
        allowedValues: ['Male', 'Female'],
        optional: true
    },
    organization : {
        type: String,
        regEx: /^[a-z0-9A-z .]{3,30}$/,
        optional: true
    },
    website: {
        type: String,
        regEx: SimpleSchema.RegEx.Url,
        optional: true
    },
    bio: {
        type: String,
        optional: true
    },
    country: {
        type: UserCountrySchema,
        optional: true
    },
    name: {
        type: String,
        optional: true
    },    
    subdomain: {
        type: String
    }
});

UserSchema = new SimpleSchema({
    _id: {
        type: String,
        max: 100,
        optional: true,
    },
    username: {
        type: String,
        regEx: /^[a-z0-9A-Z_]{3,15}$/,
        optional: true,
    },
    emails: {
        type: [Object],
        // this must be optional if you also use other login services like facebook,
        // but if you use only accounts-password, then it can be required
        optional: true
    },
    "emails.$.address": {
        type: String,
        regEx: SimpleSchema.RegEx.Email
    },
    "emails.$.verified": {
        type: Boolean
    },
    createdAt: {
        type: Date,
        optional: true,
    },
    profile: {
        type: UserProfileSchema,
        optional: true
    },
    services: {
        type: Object,
        optional: true,
        blackbox: true
    },
    // Add `roles` to your schema if you use the meteor-roles package.
    // Note that when using this package, you must also specify the
    // `Roles.GLOBAL_GROUP` group whenever you add a user to a role.
    // Roles.addUsersToRoles(userId, ["admin"], Roles.GLOBAL_GROUP);
    // You can't mix and match adding with and without a group since
    // you will fail validation in some cases.
    roles: {
        type: Object,
        optional: true,
        blackbox: true
    }
});

Meteor.users.attachSchema(UserSchema);

// Meteor methods related to collection
Meteor.methods({
  saveProfile: function (doc) {
    // TODO: check security (call clean or cleanschema)

    if (! Meteor.userId()) {
      Notifications.error('Authorization Error', 'Please login to update your profile');
      throw new Meteor.Error("not-authorized");
    };
    // Important server-side check for security and data integrity
    // check(doc, DukSchema);

    // If the edge does not exist create it
    Meteor.users.update(
      {_id: doc._id},
      {$set: {profile: doc.profile}}
    );
  }
});
