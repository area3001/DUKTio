Meteor.startup(function () {
  // Set standard behavior for the notifications
  // https://github.com/gfk-ba/meteor-notifications
  _.extend(Notifications.defaultOptions, {
      timeout: 6000
  });


  // The accounts-entry will work together with https://github.com/aldeed/meteor-simple-schema#example to perform validation
  AccountsEntry.config({
    // logo: 'logo.png',                  // if set displays logo above sign-in options
    // privacyUrl: '/privacy-policy'     // if set adds link to privacy policy and 'you agree to ...' on sign-up page
    // termsUrl: '/terms-of-use'         // if set adds link to terms  'you agree to ...' on sign-up page
    homeRoute: '/',                    // mandatory - path to redirect to after sign-out
    dashboardRoute: '/',      // mandatory - path to redirect to after successful sign-in
    profileRoute: 'profile',
    passwordSignupFields: 'EMAIL_ONLY',
    showSignupCode: false,
    showOtherLoginServices: true,      // Set to false to hide oauth login buttons on the signin/signup pages. Useful if you are using something like accounts-meld or want to oauth for api access
    extraSignUpFields: [{             // Add extra signup fields on the signup page
      field: "subdomain",                           // The database property you want to store the data in
      name: '"cool_stuff" will allow to use "cool_stuff.dukt.io/..."',  // An initial value for the field, if you want one
      label: "Subdomain",                      // The html lable for the field
      placeholder: '"cool_stuff" will allow to use "cool_stuff.dukt.io/..."',                 // A placeholder for the field
      type: "text",                            // The type of field you want
      required: true                           // Adds html 5 required property if true
     }]
  });
  
});
