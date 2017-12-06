/**
 * NOTE: An extension of the simplePagination to fit the needs of this project
 */

(function (exports) {

  var jivPaging = function (options) {
    this._initOptions(options);
    this.updateItems();
    if (this._options.showAllSltr) {
      this.showAllAction();
    }
    if (this._options.itemsPerPageSltr) {
      this.updateItemsPerPageAction();
    }
    if (this._options.filtersSltr) {
      var parentScope = this;
      $(this._options.filtersSltr).change(function(event){
        var $el = $(event.target);
        parentScope.updateFilters($el.val(), $el.is(':checked'));
      });
    }
  };

  jivPaging.prototype._initOptions = function (options) {
    this._options = options || this._options;
    this._options.paginationSltr = options.hasOwnProperty('paginationSltr') ? options.paginationSltr : '';
    this._options.itemListSltr = options.hasOwnProperty('itemListSltr') ? options.itemListSltr : '';
    this._options.itemsPerPage = options.hasOwnProperty('itemsPerPage') ? options.itemsPerPage : 5;
    this._options.showAllSltr = options.hasOwnProperty('showAllSltr') ? options.showAllSltr : '';
    this._options.itemsPerPageSltr = options.hasOwnProperty('itemsPerPageSltr') ? options.itemsPerPageSltr : '';
    this._options.$pagination = $(this._options.paginationSltr);
    this._options.filtersSltr = options.hasOwnProperty('filtersSltr') ? options.filtersSltr : '';
    var parentScope = this;
    this._options.$pagination.pagination({
      itemsOnPage: parentScope._options.itemsPerPage,
      pagerClasses: 'pagination pagination-sm',//NOTE: I added this setting to get the style right
      onPageClick: function (pageNumber) {
        var showFrom = parentScope._options.itemsPerPage * (pageNumber - 1);
        var showTo = showFrom + parentScope._options.itemsPerPage;
        parentScope._options.items.hide().slice(showFrom, showTo).show();
      }
    });
  };

  jivPaging.prototype.hideControls = function () {
    $(this._options.showAllSltr).hide();
    $(this._options.itemsPerPageSltr).hide();
    $(this._options.paginationSltr).hide();
  };

  jivPaging.prototype.updateItems = function () {
    this._options.items = this._options.items || $(this._options.itemListSltr);

    if (this._options.items.length <= 0) {
      this.hideControls();
    }
    else {
      //NOTE: If we want to make this dynamic this logic would be put here in the updateItems method
      var currentFilter = this._optoins.currentFilters;
      if(currentFilter && currentFilter.length){}

      this._options.$pagination.pagination("updateItems", this._options.items.length);
      var page = Math.min(
        this._options.$pagination.pagination("getCurrentPage"),
        this._options.$pagination.pagination("getPagesCount")
      );
      this._options.$pagination.pagination("selectPage", page);
    }
  };

  jivPaging.prototype.showAllAction = function () {
    $(this._options.showAllSltr).click(function (event) {
      var $el = $(event.target);
      if ($el.attr('data-showall') === 'false') {
        event.preventDefault();
        $el.html(jivPaging._options.itemsPerPage + ' per page');
        $el.attr('data-showall', true);
        $el.attr('data-perpage', jivPaging._options.itemsPerPage);
        jivPaging._options.itemsPerPage = jivPaging._options.items.length;
        jivPaging._options.$pagination.pagination('updateItemsOnPage', jivPaging._options.items.length);
        jivPaging.updateItems();
      }
      else {
        this._options.itemsPerPage = $el.attr('data-perpage') | 0;
        $el.html('Show All');
        $el.attr('data-showall', false);
        this.updateItems();
        this._options.$pagination.pagination('updateItemsOnPage', this._options.itemsPerPage);
      }
    });
  };

  jivPaging.prototype.updateItemsPerPageAction = function () {
    $(this._options.itemsPerPageSltr).change(function () {
      this._options.itemsPerPage = $(this).val() | 0;
      this.updateItems();
      this._options.$pagination.pagination('updateItemsOnPage', this._options.itemsPerPage);
    });
  };

  jivPaging.prototype.updateFilters = function (filterValue, add) {
    var filtersValues = this._options.currentFilters || [];
    if(add) {
      filtersValues.push(filterValue);
    }
    else{
      var idx = filtersValues.indexOf(filterValue);
      if(idx > -1){
        filtersValues.splice(idx, 1);
      }
    }
    this._options.currentFilters = filtersValues;
    this.updateItems();
    console.log(filtersValues);
  };

  exports.jivPaging = jivPaging;
})(window);