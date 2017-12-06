(function (exports) {
  var $addNewsPostForm = $('#newsPostForm');
  var $closeBtn = $('#newsModalClose');

  var _setUpDatePickers = function () {
    $('#releaseDateNew').datepicker();
    $('#releaseDateIconNew').click(function () {
      $('#releaseDateNew').datepicker('show');
    });
    
    $('#releaseDateEdit').datepicker();
    $('#releaseDateIconEdit').click(function () {
      $('#releaseDateEdit').datepicker('show');
    });
  };
  _setUpDatePickers();

  $('#newsCategories').tokenfield();
  $('#newsAlert').hide();
  $.validator.addMethod('filesize', function (value, element, param) {
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
      image: {filesize: 2097152},
      content: {
        required: function (element) {
          CKEDITOR.instances.content.updateElement();
          return true;
        }
      }
    },
    messages: {image: "File must not exceed 2MB"},
    errorPlacement: function (error, element) {
      var $el = $(element);
      $(element).parent().siblings('.errorTxt').append(error);
    },
    success: function (element) {
    },
    submitHandler: function (form) {
      CKEDITOR.instances.content.updateElement();// NOTE: Have to call this in case people paste txt in.
      var $form = $(form);
      var formUrl = $form.attr('action');
      var formData = new FormData($form[0]);
      // This variable is needed for the check for duplicate headline names
      formData.append('communityurlFriendlyUrl', $('#id-sel-com :selected').attr('data-urlfriendlyid'));
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
          $('#newsAlert').html(data.message || message).removeClass('hidden').show();
        }
      });
    }
  });
  
  $('#addNews').on('hidden.bs.modal', function(e) {
    if ( !$('#newPostMessage').hasClass('hide') ) {
      window.location.reload();
    }
  });

  exports.initialSortByPublishDate = function () {
    var mylist = $('#id-ul-timeline');
    var listitems = mylist.children('li').get();
    listitems.sort(function (a, b) {
      var date1 = new Date($(a).find('.dates').attr('data-sort'));
      var date2 = new Date($(b).find('.dates').attr('data-sort'));
      if (date1 === ""){
        return 1;
      }
      else if (date2 === ""){
        return -1;
      }
      else {
        return date1 > date2 ? -1 : date1 < date2 ? 1 : 0;
      }
    });
    $.each(listitems, function (idx, itm) {
      mylist.append(itm);
    });
  };

  $('#id-sel-sort').change(function () {
    switch ($('#id-sel-sort').val()) {
      case 'Headline':
        var mylist = $('#id-ul-timeline');
        var listitems = mylist.children('li').get();
        listitems.sort(function (a, b) {
          return $(a).find('.timeline-header').attr('data-sort').toUpperCase().localeCompare($(b).find('.timeline-header').attr('data-sort').toUpperCase());
        });
        $.each(listitems, function (idx, itm) {
          mylist.append(itm);
        });
        break;
      case 'Publishing Date':
        var mylist = $('#id-ul-timeline');
        var listitems = mylist.children('li').get();
        listitems.sort(function (a, b) {
          var date1 = new Date($(a).find('.dates').attr('data-sort'));
          var date2 = new Date($(b).find('.dates').attr('data-sort'));
          if (date1 === ""){
            return 1;
          }
          else if (date2 === ""){
            return -1;
          }
          else {
            return date1 > date2 ? -1 : date1 < date2 ? 1 : 0;
          }
        });
        $.each(listitems, function (idx, itm) {
          mylist.append(itm);
        });
        break;
      case 'Community Name':
        var mylist = $('#id-ul-timeline');
        var listitems = mylist.children('li').get();
        listitems.sort(function (a, b) {
          return $(a).find('#id-name-p').attr('data-sort').toUpperCase().localeCompare($(b).find('#id-name-p').attr('data-sort').toUpperCase());
        });
        $.each(listitems, function (idx, itm) {
          mylist.append(itm);
        });
        break;
      case 'Publishing Status':
        var mylist = $('#id-ul-timeline');
        var listitems = mylist.children('li').get();
        listitems.sort(function (a, b) {
          return $(a).find('.time').attr('data-sort').toUpperCase().localeCompare($(b).find('.time').attr('data-sort').toUpperCase());
        });
        $.each(listitems, function (idx, itm) {
          mylist.append(itm);
        });
        break;
    }
  });

  $('#id-search-bar').on('input', function() {
    var mylist = $('#id-ul-timeline');
    var listitems = mylist.children('li').get();
    var searchString = $('#id-search-bar').val();
    var re = new RegExp(searchString, 'i');
    $.each(listitems, function (idx, itm) {
      if (re.test($(itm).find('.timeline-header').attr('data-sort'))) {
        $(itm).show();
      }
      else {
        $(itm).hide();
      }
    });
  });

  $('#editNews').on('show.bs.modal', function(e) {
    // Get data-* attributes
    var headline = $(e.relatedTarget).data('headline');
    var releaseDate = $(e.relatedTarget).data('release-date');
    var categories = $(e.relatedTarget).data('categories');
    var content = $(e.relatedTarget).data('content');
    var currentImage = $(e.relatedTarget).data('current-image');
    var approve = $(e.relatedTarget).data('approve-news');
    var username = $(e.relatedTarget).data('username');
    var communityUrlFriendlyId = $(e.relatedTarget).data('community-url');
    var newsUrlFriendlyId = $(e.relatedTarget).data('news-url');
    // Populate the modal fields
    $(e.currentTarget).find('input[name="headline"]').val(headline);
    $(e.currentTarget).find('input[name="releaseDate"]').val(moment(releaseDate).format('MM/DD/YYYY'));
    $('#category-edit').tokenfield('setTokens', categories);
    $(e.currentTarget).find('textarea[name="content"]').val(content);
    CKEDITOR.instances['contentEdit'].setData(content);
    $(e.currentTarget).find('img[name="current-image"]').attr('src', currentImage);
    $(e.currentTarget).find('.approveNews').bootstrapSwitch('state', approve);
    $(e.currentTarget).find('img[name="current-image"]').css('visibility', 'visible');
    $(e.currentTarget).find('input[name="communityID"]').val(communityUrlFriendlyId);
    $(e.currentTarget).find('input[name="newsID"]').val(newsUrlFriendlyId);
    $('#newsEditForm').attr('action', '/news/'+username+'/'+communityUrlFriendlyId+'/'+newsUrlFriendlyId);
  });

  $("[class='approveNews']").bootstrapSwitch();
  $('.approveNews').on('switchChange.bootstrapSwitch', function (event, state) {});

  // Set minWidth so the placeholder text doesn't get cut off
  $("#category-edit").tokenfield({minWidth: 650});
  $("#category-new").tokenfield({minWidth: 650});

  $('#deleteNews').on('show.bs.modal', function(e) {
    // Get data-* attributes
    var communityUrl = $(e.relatedTarget).data('community-url');
    var newsUrl = $(e.relatedTarget).data('news-url');
    var newsId = $(e.relatedTarget).data('news-id');
    // Populate the modal fields
    $(e.currentTarget).find('button[id="id-delete-btn"]').attr('data-community-url', communityUrl);
    $(e.currentTarget).find('button[id="id-delete-btn"]').attr('data-news-url', newsUrl);
    $(e.currentTarget).find('button[id="id-delete-btn"]').attr('data-news-id', newsId);
  });

  exports.deleteNewsPost = function (element) {
    var formData = {};
    formData.communityFriendlyURL = $("#id-delete-btn").attr('data-community-url');
    formData.newsFriendlyURL = $("#id-delete-btn").attr('data-news-url');
    $.ajax({
      type: "POST",
      url: '/community/remove-news-post',
      contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
      data: formData,
      success: function (data) {
        $('#deleteNews').modal('hide');
        // Remove the news div
        $('#id-news-'+$("#id-delete-btn").attr('data-news-id')).remove();
      },
      error: function (data) {
        // TODO: Alert of error
      }
    });
  };

  $('#newsEditForm').submit( function (event) {

    // Don't send the form yet
    event.preventDefault();

    // Call the update method so the new textarea data is sent
    CKEDITOR.instances['contentEdit'].updateElement();
    
    var formData = new FormData();
    var formValues = $(this).serializeArray();
    var fileInput = document.getElementById('image');
    var file = fileInput.files[0];
    // Add the form data
    for (var idx in formValues) {
      formData.append(formValues[idx].name, formValues[idx].value)
    }
    // Add the image
    formData.append('image', file);
    
    $.ajax({
      type: "PUT",
      url: $(this).attr('action'),
      contentType: false,
      processData: false,
      data: formData,
      success: function (data) {
        if (data.error) {
          $('#newsAlertEdit').html(data.error).removeClass('hidden').show();
        }
        else {
          $('#newsEditForm').hide();
          $('#newsEditMessage').removeClass('hide').show();
        }
      },
      error: function (data) {
        $('#newsAlertEdit').html(data.message || data.statusText).removeClass('hidden').show();
      }
    });

  });

  $('#editNews').on('hidden.bs.modal', function(e) {
    if ( !$('#newsEditMessage').hasClass('hide') ) {
      window.location.reload();
    }
  });

})(window);