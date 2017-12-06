module.exports = {
  repeat: function (str, rptCnt) {
    /**
     * Repeats a given phrase n times. Perfect for testing word limits
     * @str the str to repeat
     * @rptCnt the number of times to repeat str
     */
    return new Array(rptCnt).join(str);
  },
  format: function (format) {
    /**
     * A JS implementation of a string format from other languages.
     */
    var args = Array.prototype.slice.call(arguments, 1);
    return format.replace(/{(\d+)}/g, function (match, number) {
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
        ;
    });
  },
  removeWhitespace: function (str) {
    return str.replace(/\s+/g, '');
  },
  getUrlFriendlyString: function (str) {
    /**
     * Returns a string in a URL friendly format.
     * @param string str The input string.
     * @return string The URL friendly string.
     */
    // convert spaces to '-'
    str = str.replace(/ /g, "-");
    // Make lowercase
    str = str.toLowerCase();
    // Remove characters that are not alphanumeric or a '-'
    str = str.replace(/[^a-z0-9-]/g, "");
    // Combine multiple dashes (i.e., '---') into one dash '-'.
    str = str.replace(/[-]+/g, "-");
    return str;
  }
};