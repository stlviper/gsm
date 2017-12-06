(function (exports) {
  var $addNewsPostForm = $('#newsPostForm');
  var $closeBtn = $('#newsModalClose');

  var _setUpDatePickers = function () {
    var $releaseDateInpt = $('#releaseDate');
    $releaseDateInpt.datepicker();
    $('#releaseDateIcon').click(function () {
      $releaseDateInpt.datepicker('show');
    });

  };
  _setUpDatePickers();

  $('#newsCategories').tokenfield();
  $('#newsAlert').hide();
    $.validator.addMethod('filesize', function(value, element, param) {
    return this.optional(element) || (element.files[0].size <= param) 
});
  var newsFormValidator = $addNewsPostForm.validate({

    ignore: [],//NOTE: Picks up hidden fields
    rules: {
      headline: {
        required: true
      },
      releaseDate: {
        required: true,
        date: true
      },
	  image: { filesize: 2097152  },
      content: {
        required: function (element) {
          CKEDITOR.instances.content.updateElement();
          return true;
        }
      }
    },
	messages: { image: "File must not exceed 2MB" },
    errorPlacement: function (error, element) {
      var $el = $(element);
      $(element).parent().siblings('.errorTxt').append(error);
    },
	success: function (element){},
    submitHandler: function (form) {
      CKEDITOR.instances.content.updateElement();// NOTE: Have to call this in case people paste txt in.
      var $form = $(form);
      var formUrl = $form.attr('action');
      var formData = new FormData($form[0]);
	  var $spinner = $('#spinnerNews');
	  $spinner.show();

      $.ajax({
        url: formUrl,
        type: "POST",
        data: formData,
        processData: false,
        contentType: false,
        success: function (data) {
          $('#newPostMessage').removeClass('hide').show()
          $('#newsPostForm').hide();
		  $spinner.hide();
          newsFormValidator.resetForm();
		  
        },
        error: function (data) {
          var message = "Cannot process your request at this time.";
          if (data.responseText) {
              var responseObj = JSON.parse(data.responseText);
              message = responseObj.message || message;
              if (responseObj.message == "Invalid file type") {
                  $('#image-error').append('Invalid File Type');
              }
          }
		  $spinner.hide();
          $('#newsAlert').html(data.message || message).show();
        }
      });
    
    }
  });
  $closeBtn.click(function () {
    newsFormValidator.resetForm();
  });
})(window);