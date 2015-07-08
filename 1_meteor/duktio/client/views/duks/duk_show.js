Template.dukShow.rendered = function() {
};

Template.dukShow.helpers({
	console: function() {
		result = "";
	  $.each(this.console, function(i, val) {
		  result += "\n" + val;
		});
		return result; // will stop running to skip "five"
	}
});	

Template.dukShow.events ({
});
