Template.af_codemirror.rendered = function() {
	// var options = this.data.atts;
	// var $self = this.$('.summernote');
	// options.onblur = function(e) {
	// 	$self.change();
	// };
	// $self.summernote(options);
	// $self.closest('form').on('reset', function() {
	// 	$self.code('');
	// });
	var myCodeMirror = CodeMirror.fromTextArea(document.getElementById("af_codemirror"), {
    lineNumbers: true,
    mode: "lua"
  });
};

Template.af_codemirror.helpers({
	dataSchemaKey: function() {
		return this.atts['data-schema-key'];
	}
});