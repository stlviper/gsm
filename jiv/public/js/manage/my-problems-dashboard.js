// These functions are used by the My Problems page of the dashboard
(function (exports) {
  
  // Sort the problem tiles based on the dropdown value
  $('#id-sel-sort').change(function () {
    var mylist = $('#id-ul-timeline');
    var listitems = mylist.children('li').get();
    switch ($('#id-sel-sort').val()) {
      case 'Community Name':
        sortByName('id-com-name-', listitems);
        break;
      case 'Problem Name':
        sortByName('id-prob-name-', listitems);
        break;
      case 'Start Date':
        sortByDate('id-start-date', listitems);
        break;
      case 'End Date':
        sortByDate('id-end-date', listitems);
        break;
      default:
        // Sort by start date by default
        sortByDate('id-start-date', listitems);
        break;
    }
    $.each(listitems, function (idx, itm) {
      mylist.append(itm);
    });
  });
  
  var sortByDate = function (id, listitems) {
    listitems.sort(function (a, b) {
      var date1 = new Date($(a).find('[id^='+id+']').attr('data-sort'));
      var date2 = new Date($(b).find('[id^='+id+']').attr('data-sort'));
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
  };

  var sortByName = function (id, listitems) {
    listitems.sort(function (a, b) {
      var aSort = $(a).find('[id^=' + id + ']').attr('data-sort');
      var bSort = $(b).find('[id^=' + id + ']').attr('data-sort');
      if (aSort === '') {
        return 1;
      }
      else if (bSort === '') {
        return -1;
      }
      else {
        return aSort.toUpperCase().localeCompare(bSort.toUpperCase());
      }
    });
  };
  
  exports.initializeSortByStartDate= function() {
    var mylist = $('#id-ul-timeline');
    var listitems = mylist.children('li').get();
    sortByDate('id-start-date', listitems);
    $.each(listitems, function (idx, itm) {
      mylist.append(itm);
    });
  };
 
  // Filtering via problem name in the search bar
  $('#id-search-bar').on('input', function() {
    filterProblems();
  });

  // Filter problem tiles based on changes in the radio buttons
  $('.radio-inline').on('change', function() {
    filterProblems();
  });
  
  var filterByRadioBtns = function () {
    var selectedFilter = $('input[name="myproblems"]:checked').val();
    var tiles = $('[id^="id-tile-"]');
    tiles.show();
    switch (selectedFilter) {
      case 'all':
        // Show all of the problem tiles
        tiles.show();
        break;
      case 'open':
        $.each(tiles, function (idx, itm) {
          if ($(this).find('.time').attr('data-sort') === 'open') {
            $(this).show();
          }
          else {
            $(this).hide();
          }
        });
        break;
      case 'closed':
        $.each(tiles, function (idx, itm) {
          if ($(this).find('.time').attr('data-sort') === 'closed') {
            $(this).show();
          }
          else {
            $(this).hide();
          }
        });
        break;
      case 'draft':
        $.each(tiles, function (idx, itm) {
          if ($(this).attr('data-draft') === 'true') {
            $(this).show();
          }
          else {
            $(this).hide();
          }
        });
        break;
      default:
        tiles.show();
        break;
    }
  };
  
  var filterBySearchBar = function () {
    var mylist = $('#id-ul-timeline');
    var listitems = mylist.children('li').get();
    var searchString = $('#id-search-bar').val();
    var re = new RegExp(searchString, 'i');
    $.each(listitems, function (idx, itm) {
      if ($(itm).is(':visible')) {
        if (re.test($(itm).find('[id^="id-prob-name-"]').attr('data-sort'))) {
          $(itm).show();
        }
        else {
          $(itm).hide();
        }
      }
    });
  };
  
  var filterProblems = function () {
    filterByRadioBtns();
    filterBySearchBar();
  };

  $(document).ready(function () {
    var $startDateEl = $('#startDate');
    $startDateEl.datepicker();
    $('#startDateCalendarIcon').click(function () {
      $startDateEl.datepicker('show');
    });

    var $endDateEl = $('#endDate');
    $endDateEl.datepicker();
    $('#endDateCalendarIcon').click(function () {
      $endDateEl.datepicker('show');
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
    
    exports.submitAsDraft = function () {
      // Set the draft flag to true before submitting
      $('#submitNewBtn').attr('data-draft', true);
      $('#newDiscovery').submit();
    };

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
          /*required: function() {
            CKEDITOR.instances.description.updateElement();
          },
          required: true*/
          required: {
            depends: function () {
              CKEDITOR.instances.description.updateElement();
              return true;
            }
          }
        },
        documents: { filesize: 20971520  }
      },
      messages: { documents: "File must not exceed 20MB.", description: "A description of your Problem is required." },
      submitHandler: function (form) {
        var _CKupdate = function () {
          for (instance in CKEDITOR.instances)
            CKEDITOR.instances[instance].updateElement();
        };
        _CKupdate();
        var $form = $(form);
        var formData = new FormData($form[0]);
        // Add the draft status to the form data
        formData.append('isDraft', $('#submitNewBtn').attr('data-draft'));
        
        var $spinner = $('#spinnerDiscovery');
        $spinner.show();
        $.ajax({
          url: "/my-problems",
          type: "POST",
          data: formData,
          processData: false,
          contentType: false,
          success: function (data, jqXHR) {
            if ( !$('#submitNewBtn').attr('data-draft') ) {
              $('#submitNewBtn').hide();
              $('#newDiscovery').hide();
              $('#newProblemMessage').removeClass("hide").show();
            }
            else {
              // If submitting a draft just refresh the list and go back to it
              $('#postProblem').modal('toggle');
              window.location.reload();
            }
            $spinner.hide();
          },
          error: function (jqXHR, errorThrown) {
            $spinner.hide();
            if (jqXHR.responseJSON.message == 'Invalid file type') {
              $('<label id="documents-error" class="error" for="documents">Invalid File Type</label>').appendTo($('#documents').parent('.errPlacement'));

            } 
            else {
            // $(' .discoveryAlert', '#newDiscovery').html('<h2>' + errorMsg + '</h2>').show();
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
    
    $('#postProblem').on('hidden.bs.modal', function(e) {
      if ( !$('#newProblemMessage').hasClass('hide') ) {
        window.location.reload();
      }
    });
    
    $('#deleteProblem').on('show.bs.modal', function(e) {
      // Get data-* attributes
      var problemId = $(e.relatedTarget).data('problem-id');
      // Populate the modal fields
      $(e.currentTarget).find('button[id="id-delete-btn"]').attr('data-problem-id', problemId);
    });

    exports.deleteProblem = function (element) {
      var formData = {};
      formData.id = $("#id-delete-btn").attr('data-problem-id');
      $.ajax({
        type: "DELETE",
        url: '/my-problems',
        contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
        data: formData,
        success: function (data) {
          $('#deleteProblem').modal('hide');
          // Remove the problem div
          $('#id-tile-'+$("#id-delete-btn").attr('data-problem-id')).remove();
        },
        error: function (data) {
          // TODO: Alert of error
        }
      });
    };
    
    var $avatar_dealio = $("#avatar_dealio"),
        $cropButton = $('#crop-button'),
        $output = $("#output");

    $avatar_dealio.prepend(Handlebars.templates['image-upload-and-crop']({}));

    exports.imageUploadAndCrop = new ImageUploadAndCrop($avatar_dealio.find('.image-upload-and-crop-container'),
      {
        cropButton: $cropButton,
        onCrop: function (croppedDataURI) {
          $output.find("img").attr('src', croppedDataURI);
          $("#thumbnail").val(croppedDataURI);
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

    $('#new-discovery-categories').tokenfield({minWidth: 500})
      .on('tokenfield:createdtoken', function(e) {
        $('#new-discovery-caregories-tokenfield').attr('placeholder', '');
      })
      .on('tokenfield:removedtoken', function(e) {
        if($('#new-discovery-categories').tokenfield('getTokens').length === 0) {
          $('#new-discovery-categories-tokenfield').attr('placeholder', 'Categories');
        }
      });;
  });
})(window);
