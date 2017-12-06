$(document).ready(function(){
    createEventBindings();
});

function createEventBindings(){

    // LDAP ADMIN AREA STUFF.. Can be refactored for use in regular admin. Just whipping it together for now.
    $('a[data-button=deleteUser]').on('click', function(){
        var ans = confirm('Are you sure you want to delete\nthe account for ' + $(this).attr('data-deletename'));
        if (ans) {
            location.href = '/ldap/delete/' + $(this).attr('data-deleteusername');
        }
    });
    $('a[data-button=resetPass]').on('click', function(){
        $(':input[name="newpass"]').val('');
        $(':input[name="confirmpass"]').val('');
        $('#passwordErrorMessage, #passwordSuccessMessage').hide();
        $('#confirmpassstatus').removeClass('glyphicon-ok glyphicon-remove text-danger text-success');
        $('#modalUserName').html($(this).attr('data-resetusername'));
    });
    

    $(':input[name="newpass"]').on("keyup", function(){
        if(event.keyCode == '13') {savePasswordReset(); return;}
        checkPassword($(this).val());
        checkIfPasswordsMatch();
    });
    $(':input[name="confirmpass"]').on("keyup", function(){
        if(event.keyCode == '13') {savePasswordReset(); return;}
        checkIfPasswordsMatch();
    });
}

function checkIfPasswordsMatch(){
    if ($(':input[name="confirmpass"]').val() === $(':input[name="newpass"]').val()) {
        $('#confirmpassstatus').removeClass('glyphicon-remove text-danger').addClass('glyphicon-ok text-success');
    } else {
        $('#confirmpassstatus').removeClass('glyphicon-ok text-success').addClass('glyphicon-remove text-danger');
    }
}

function checkPassword(inputtxt)
{
    var passw = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;
    if(!inputtxt.match(passw))
    {
        $('#passwordErrorMessage').show().html("<h1 class='icon'><span class='icon-warning-o'></span></h1>Your password needs to:<br>1. Be between 6 to 20 characters.<br>2. Contain at least one numeric digit.<br>3. Contain one uppercase AND one lowercase letter.");
        return true;
    }
    else
    {
        $('#passwordErrorMessage').hide();
        return false;
    }
}

function savePasswordReset(){
    $('#passwordSuccessMessage, #passwordErrorMessage').hide();
    var payload = {
        username: $('#modalUserName').text(),
        newpass: $(':input[name="newpass"]').val(),
        confirmpass: $(':input[name="confirmpass"]').val()
    };
    
    var postPassReset = $.post('http://localhost:3000/admin/resetpass',
        payload,
        null,
        "json");
    
    postPassReset.done(function(data){
        if (data.error) {
            $('#passwordErrorMessage').show().html(data.error);
        } else {
            $('#passwordSuccessMessage').show();
        }
    });
}