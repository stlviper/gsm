$(document).ready(function () {
  var discovery_options = {
    valueNames: [
      'discovery-name', 'discovery-startdate',
      'discovery-enddate', 'discovery-tags', 'discovery-owner',
      'discoveryCategories', 'status', 'defaultSort'
    ],
    page: 20,
    plugins: [
      ListPagination({
        paginationClass: 'discoveries-pagination'
      })
    ]
  };


  if($('#discoveries-list ul.list').length) {

    $('#discoveries-itemsperpage').val(discovery_options.page);
    if(document.getElementById('null-discoveries') == null){
    var discoveriesList = new List('discoveries-list', discovery_options);
    discoveriesList.sort('defaultSort', {order: "asc"});
	}
    $('#discoveries-showall').click(function () {
      var $el = $(this);
      if ($el.attr('data-showall') == 'false') {
        $el.html('Show ' + discoveriesList.page + ' per page');
        $el.attr('data-showall', true);
        discoveriesList.page = discoveriesList.items.length;
        discoveriesList.update();
        discoveriesList.search();
      }
      else {
        $el.html('Show all');
        $el.attr('data-showall', false);
        discoveriesList.page = $('#discoveries-itemsperpage').val() | 0;
        discoveriesList.update();
      }
      return false;
    });
    $('#discoveries-itemsperpage').change(function () {
      discoveriesList.page = $(this).val() | 0;
      $('#discoveries-showall').attr('data-showall', false).html('Show all');
      discoveriesList.update();
    });
    $('#discoveries-categories').multiselect({
      onChange: function () {
        filterList();
      }
    });



    $('.discovery-filter').click(function () {
      filterList();
    });


    var filterList = function () {
      var $filters = $('.discovery-filter:checked');
      var $categories = $('#discoveries-categories > option:checked');

      var filters = [];
      $filters.each(function () {
        filters.push($(this).val());
      });

      var categories = [];
      $categories.each(function () {
        categories.push($(this).val());
      });

      if (categories.length == 0 && filters.length == 0) {
        discoveriesList.filter();
      }
      else {
        discoveriesList.filter(function (item) {
          var itemStatus = item.values().status.trim().split(',');
          var itemCategories = item.values().discoveryCategories.trim().split(',');
          if (categories) {
            if (itemCategories.length >= categories.length) {
              for (var idx in categories) {
                if (itemCategories.indexOf(categories[idx]) <= -1) {
                  return false;
                }
              }
            }
          }
          if (filters) {
            if (itemStatus.length >= filters.length) {
              for (var idx in filters) {
                if (itemStatus.indexOf(filters[idx]) <= -1) {
                  return false;
                }
              }
            }
          }
          return true;
        });
      }
    };

  }

  var $startDateEl = $('#startDate');
  $startDateEl.datepicker();
  $('#startDateCalendarIcon').click(function () {
    $startDateEl.datepicker('show');
    console.log('startDate');
  });

  var $endDateEl = $('#endDate');
  $endDateEl.datepicker();
  $('#endDateCalendarIcon').click(function () {
    $endDateEl.datepicker('show');
    console.log('endDate');
  });
  $('#managerInputs').change(function () {
      var element = $('#discoveryManagers');
      var managers = element.val();
      managers = managers.replace(/\s+/g, '');
      managers = managers.split(",");
      var evaluators = $('#discoveryEvaluators').val();
      evaluators = evaluators.replace(/\s+/g, '');
      evaluators = evaluators.split(",");
      for (var i = 0; i < managers.length; i++) {
          if (evaluators.indexOf(managers[i]) > -1) {
              var errCheck = document.getElementById('discoveryManagers-error');
              if (errCheck == null) {
                  $('<label id="discoveryManagers-error" class="error" for="discoveryManagers">That user is already assigned as an Evaluator</label>').appendTo(element.parent().parent('.errPlacement'));
              }
              return false;
          } else {
              $('#discoveryManagers-error').remove();
          }
      }
  });
  $('#evaluatorInputs').change(function () {
      var element = $('#discoveryEvaluators');
      var evaluators = element.val();
      evaluators = evaluators.replace(/\s+/g, '');
      evaluators = evaluators.split(",");
      var managers = $('#discoveryManagers').val();
      managers = managers.replace(/\s+/g, '');
      managers = managers.split(",");

      for (var i = 0; i < evaluators.length; i++) {
          
          if (managers.indexOf(evaluators[i]) > -1) {
              var errCheck = document.getElementById('discoveryEvaluators-error');
              if (errCheck == null) {
                  $('<label id="discoveryEvaluators-error" class="error" for="discoveryEvaluators">That user is already assigned as a Manager</label>').appendTo(element.parent().parent('.errPlacement'));
              }
              return false;
          } else {
              $('#discoveryEvaluators-error').remove();
          }
      }
  });
$.validator.addMethod('filesize', function(value, element, param) {
    return this.optional(element) || (element.files[0].size <= param) 
});
$.validator.addMethod('sameValue', function () {
    var managers = $('#discoveryManagers').val();
    managers = managers.replace(/\s+/g, '');
    managers = managers.split(",");
    var evaluators = $('#discoveryEvaluators').val();
    evaluators = evaluators.replace(/\s+/g, '');
    evaluators = evaluators.split(",");
    
    for (var i = 0; i < managers.length; i++) {
        if (evaluators.indexOf(managers[i]) > -1) {
            return false;
        }
    }
    return true;
});

  $('#newDiscovery').validate({
    rules: {
      name: {
        required: true
      },
      discoveryManagers: {
          required: true,
          sameValue: true
      },
      startDate: {
        required: true,
        date: true
      },
      endDate: {
        required: true,
        date: true
      },
      description: {
        required: function() {
          CKEDITOR.instances.description.updateElement();
        }
      },
	  documents: { filesize: 20971520  }
      },
	  messages: { documents: "File must not exceed 20MB" },
    submitHandler: function (form) {
      var _CKupdate = function () {
        for (instance in CKEDITOR.instances)
          CKEDITOR.instances[instance].updateElement();
      };
      _CKupdate();
      var $form = $(form);
      var formData = new FormData($form[0]);
	  var $spinner = $('#spinnerDiscovery');
	  $spinner.show();
      $.ajax({
        url: "/problems/create",
        type: "POST",
        data: formData,
        processData: false,
        contentType: false,
        success: function (data, jqXHR) {
          $('#submitNewBtn').hide();
          $('#newDiscovery').hide();
		  $spinner.hide();
          $('#newProblemMessage').show();
        },
        error: function (jqXHR, errorThrown) {
          $spinner.hide();
          if (jqXHR.responseJSON.message == 'Invalid file type') {
              $('<label id="documents-error" class="error" for="documents">Invalid File Type</label>').appendTo($('#documents').parent('.errPlacement'));

          } else {
            var errorMsgs = '';
            // Loop through the validation errors and display them
            for(var property in jqXHR.responseJSON) {
              if (jqXHR.responseJSON.hasOwnProperty(property)) {
                errorMsgs += '<h2>' + jqXHR.responseJSON[property] + '</h2>';
              }
            }
            $(' .discoveryAlert', '#newDiscovery').html(errorMsgs).show();
            $(' .discoveryAlert', '#newDiscovery').addClass('alert');
            $(' .discoveryAlert', '#newDiscovery').addClass('alert-danger');
          }
        }
      });
    },
    errorPlacement: function (error, element) {
        
        if (element.attr('id') == "discoveryManagers") {
            error.appendTo(element.parent().parent('.errPlacement'));
        }
      error.appendTo(element.parent('.errPlacement'));
    },
    ignore: ':hidden:not("#description")',

  });
  $.extend($.validator.messages, {
      required: "This field is required.",
      sameValue: "User can only be a Manager or Evaluator"
  });
  var $avatar_dealio = $("#thumbnail-dealio"),
    $cropButton = $('#thumbnail-crop-button'),
    $output = $("#output"),
    $uploadOutput = $('#thumbnail');

  $avatar_dealio.prepend(Handlebars.templates['image-upload-and-crop']({}));
  //if(document.getElementById('editTag') != null){
  var imageUploadAndCrop = new ImageUploadAndCrop($avatar_dealio.find('.image-upload-and-crop-container'),
    {
      cropButton: $cropButton,
      onCrop: function (croppedDataURI) {
        $output.find("img").attr('src', croppedDataURI);
        $uploadOutput.val(croppedDataURI);
        $output.show();
      },
      onImageUpload: function () {
        $cropButton.show();
      },
      onImageUploadError: function () {
        $cropButton.hide();
      }
    }
  );
  //}
  $('[data-toggle="tooltip"]').tooltip();

  // Do not allow duplicate selections
  $('#discoveryEvaluators').on("tokenfield:createtoken", function(e) {
    var newTokenValue = e.attrs.value;
    var existingTokens = $('#discoveryEvaluators').tokenfield('getTokens');

    for(var i in existingTokens) {
      if(existingTokens[i].value === newTokenValue) {
        return false
      }
    }

    return true;
  })
    .on('tokenfield:createdtoken', function(e) {
      $('#discoveryEvaluators-tokenfield').attr('placeholder', '');
    })
    .on('tokenfield:removedtoken', function(e) {
      if($('#discoveryEvaluators').tokenfield('getTokens').length === 0) {
        $('#discoveryEvaluators-tokenfield').attr('placeholder', 'Problem Evaluator(s)');
      }
    });

  $('#discoveryManagers').on("tokenfield:createtoken", function(e) {
    var newTokenValue = e.attrs.value;
    var existingTokens = $('#discoveryManagers').tokenfield('getTokens');

    for(var i in existingTokens) {
      if(existingTokens[i].value === newTokenValue) {
        return false
      }
    }

    return true;
  })
    .on('tokenfield:createdtoken', function(e) {
      $('#discoveryManagers-tokenfield').attr('placeholder', '');
    })
    .on('tokenfield:removedtoken', function(e) {
      if($('#discoveryManagers').tokenfield('getTokens').length === 0) {
        $('#discoveryManagers-tokenfield').attr('placeholder', 'Problem Manager(s), enter at least one');
      }
    });;

  $('#new-discovery-categories').tokenfield({})
    .on('tokenfield:createdtoken', function(e) {
      $('#new-discovery-caregories-tokenfield').attr('placeholder', '');
    })
    .on('tokenfield:removedtoken', function(e) {
      if($('#new-discovery-categories').tokenfield('getTokens').length === 0) {
        $('#new-discovery-categories-tokenfield').attr('placeholder', 'Categories');
      }
    });;


});

