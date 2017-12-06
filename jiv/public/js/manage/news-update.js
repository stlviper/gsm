$(document).ready(function () {

  var $updateForm = $('#newsPostForm');
  var _setUpDatePickers = function () {
    var $releaseDateInpt = $('#releaseDate');
    $releaseDateInpt.datepicker();
    $('#releaseDateIcon').click(function () {
      $releaseDateInpt.datepicker('show');
    });

  };
  _setUpDatePickers();

  $('#newsCategories').tokenfield();
  var newsFormValidator = $updateForm.validate({

    ignore: [],//NOTE: Picks up hidden fields
    rules: {
      headline: {
        required: true
      },
      releaseDate: {
        required: true,
        date: true
      },
      content: {
        required: function (element) {
          CKEDITOR.instances.content.updateElement();
          return true;
        }
      }
    },
    errorPlacement: function (error, element) {
      var $el = $(element);
      $(element).parent().siblings('.errorTxt').append(error);
    }
  });
});