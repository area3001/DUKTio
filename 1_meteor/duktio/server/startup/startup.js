Meteor.startup(function () {

  AccountsEntry.config({
    // signupCode: 'InTheAir',         // only restricts username+password users, not OAuth
    
		wrapLinks: true,                   // wraps accounts-entry links in <li> for bootstrap compatability purposes
		homeRoute: '/',                  // MUST BE SET - redirect to this path after sign-out
		dashboardRoute: '/',
		defaultProfile:{
        someDefault: 'default'
    }
  });
}); 
