var config = require('../config');

module.exports = {
  chatClient: config.chat.client,
  chatServer: config.chat.server,
  PublicStaticContentDirectoryFullPrefixPath: config.publicDirectoryFullPrefixPath,
  PublicStaticThemeImagesDirectoryFullPrefixPath: config.publicThemeImagesDirectoryFullPrefixPath,
  PrivateUploadsDirectoryFullPrefixPath: config.privateUploadsDirectoryFullPrefixPath,

  SiteTitle: 'GEOINT Solutions Marketplace',
  News: {
    NewsPost: "Your news has been successfully submitted."
  },
  Header: {
    Login: 'Log In',
    Join: 'Sign Up',
    ProfileMenu: {
      Profile: 'My Profile',
      Dashboard: 'My Dashboard',
      Logout: 'Log Out'
    },
    AdminMenu: {
      Users: 'Users',
      News: 'News',
      Organizations: 'Organizations',
      Capabilities: 'Capabilities',
      Problems: 'Problems',
      Communities: 'Communities',
      Logs: 'Logs',
      Solutions: 'Solutions'
    }
  },

  Navbar: {
    Home: 'Home',
    Community: 'Communities',
    MarketSpace: {
      Title: 'Marketspace',
      Options: {
        Capabilities: 'Capabilities',
        Problems: 'Problems'
      }
    },
    Organizations: {
      Title: "Organizations",
      Options: {
        Providers: 'Providers',
        Clients: 'Explorers'
      }
    },
    FAQ: 'FAQ',
    Contact: 'Contact Us'
  },

  Capabilities: {
    Title: 'Capabilities',
    TitleUserUpdate: 'Capability User Update',
    TitleAdmin: 'Capability Administration',
    TitleAdminUpdate: 'Capability Admin Update',
    TitleNew: 'New Capability',
    TitleDelete: 'Capability Delete',
    TitleAdminView: 'Capability Admin View',
    Caption: '<p>' +
    'GSM provides the platform to exhibit the visionary and inventive capabilities developed by the leading-edge ' +
    'organizations found within GSM that are commercially-viable and ready to solve the toughest challenges. ' +
    'See the FAQ for more details.' +
    '</p> ' +
    '<p> ' +
    'Your organization can choose to put the spotlight on your capability by clicking the Showcase button below. ' +
    'After your capability is added, you can get involved in an engaging dialog by discussing it in the Collaboration ' +
    'area or by participating in a Problem to have your capability assessed in front of live decision-making customers. ' +
    '</p>',
    NoResults: 'There are no results for this category.',
    ComeBackLater: 'Come back to soon to see what Providers have to offer!',
    QuantityLabel: 'Qty',
    CategoryLabel: 'Category',
    Buttons: {
      SubmitNew: 'Add Your Capability'
    },
    CapabilityCards: {
      NameLabel: 'Name',
      OrganizationLabel: 'Organization',
      CategoryLabel: 'Category',
      DisqusLinkLabel: 'Discuss'
    },
    Filters: {
      Analytics: 'Analytics',
      Collaboration: 'Collaboration',
      CyberSecurity: 'Cyber Security',
      GIS: 'GIS',
      Imaging: 'Image Processing',
      Infrastructure: 'Infrastructure',
      Modeling: 'Modeling',
      RemoteSensing: 'Remote Sensing',
      Search: 'Search',
      Visualization: 'Visualization'
    },
    Messages: {
      FailedUpdate: 'Could not update your capability at this time',
      InvalidEmail: 'Invalid email address',
      InvalidUrl: 'Invalid web link',
      ErrorRetrievingCapabilities: 'Error occurred while retrieving the capabilities.',
      VerifyAuthorization: 'You must certify you are authorized and that it meets the FAR requirements.',
      FailToRetrieveCapability: 'Could not retrieve your capability at this time.',
      SuccessfulUpdate: 'Capability successfully updated.',
      NoCapabilityMatch: 'No capability matched that ID.',
      CannotApprove: 'Cannot mark the capability approved.',
      Approved: 'Capability is marked approved.',
      NotApproved: 'Capability is not approved.',
      NewCapability: 'Your capability has been successfully submitted.'
    },
    Disqus: {
      Title: 'Capability Discussion'
    },
    VettingWarning: 'This capability will not appear in the marketplace until it has been approved.'
  },

  Organizations: {
    NoOrganizations: 'Come back soon to see who has joined OR be the first!',
    Title: 'Organizations'
  },

  Community: {
    Messages: {
      CommunityCreation: 'Your community request has been submitted. We will contact you after it has been reviewed.',
      NoMembersAlert: 'Before the first to join this community',
      NotMemberProblemAlert: 'You must first join the community to start a Problem.',
	    NotExplorerProblemAlert: 'You must be an Explorer or Community owner to start a Problem.'
    },
    AboutPage: {
      Caption: 'Insert Caption Description for your Community',
      About: 'This section is to describe the purpose of the community and the mission focus. Please edit this text out and insert your own description.',
      WhyJoin: 'This section is to draw potential users to join. This could highlight success stories, reasons why it would work for them, and intended collaboration/interaction activties desired by the community owner. Please edit this text out and insert your own description.'
    }
  },

  Solutions: {
    Messages: {
      NoCapabilities: 'Please register a capability to use this field'
    },
    Feedback: {
      Success: "Thank you for submitting your feedback.",
      BackButton: "Back to Solutions"
    }
  },

  Problems: {
    Title: 'Problems',
    NoProblems: 'There are currently no open Problems. Please check back soon!',
    newProblemMessage: 'Your Problem has been submitted. You will be contacted after it has been reviewed.',
    NotAExplorerProblem: 'This feature is only available to Explorers. If you would like to upgrade your account to become an Explorer, please contact gsmhelp@geoint.community',
    NotMemberSolutionSubmissionAttempt: 'You must be a member of this community in order to submit a Solution to the Problem. <br />Please join the community by clicking &nbsp ' //BHughes-IS THIS STILL NEEDED?--
  },


  /* The entries for the faq can be added and removed from here and will reflect on the page. */
  FAQ: {
    Title: 'Frequently Asked Questions (FAQs)',
    Caption: 'FAQs',
    Entries: [
      {
        Question: 'What is GSM?',
        Answer: '<p><img src="' + config.publicThemeImagesDirectoryFullPrefixPath + '/faq-whatis.png" alt="What is GSM" class="img-responsive center-block"/></p>GEOINT Solutions Marketplace (GSM) is a market research platform that allows businesses, government, and academic institutions to find new tools, techniques, ideas, and applications. GSM provides a online environment to provide access to a personalized experience of your capability without exposing intellectual property or requiring a contractual commitment.'

      },

      {
        Question: 'How does it work?',
        Answer: '<p><img src="' + config.publicThemeImagesDirectoryFullPrefixPath + '/faq-process.png" alt="gsm process" class="img-responsive center-block"/></p>Signing up your company only takes a few minutes!  Simply click the "Sign Up" button in the top right corner to get started.  Once signed up, you will be able to market your organization, add capabilities you may have to the Capabilities Catalog for other users to discover you, and provide <u><i>private</i></u> solutions to posted National Geospatial-Intelligence Agency (NGA) problems under the Problem Center.  Review of your solution submission begins immediately. GSM will touch every part of NGA and come back to you with feedback as soon as possible.'
      },
        
      {
        Question: 'How do I sign up?',
        Answer: '<p><img src="' + config.publicThemeImagesDirectoryFullPrefixPath + '/faq-signup.png" alt="Sign up" class="img-responsive center-block"/></p> Organizations can sign up to GSM by clicking <a href="/join">Sign Up</a> on the toolbar in the upper right corner of the window. It is free to sign up!'
      },

      
    {
        Question: 'What do I need to work with the US Government?',
        Answer: 'You will need 2 pieces of data first: a <b>DUNS number</b> and a <b>SAM.Gov account</b>.<br><br>The <b>DUNS number</b> is the 9-digit identification for contracting or other nongovernmental organizations. The Federal Acquisition Regulation (FAR) incorporated the DUNS number in April 1998 as the U.S. Government’s contractor identification code for all procurement-related activities. If your organization does not have a DUNS number, you can <a href="http://fedgov.dnb.com/webform" target="_blank">request one here</a>. If you don’t know your organization’s DUNS number, you can search for it by going to the <a href="http://www.sam.gov" target="_blank">SAM.Gov database</a> and clicking <b>Search Records</b>.<br><br>The <a href="http://www.sam.gov" target="_blank">System for Award Management (SAM)</a> is the official U.S. Government system that registers your organization – i.e., business, educational institution, individual, or government agency – in order to conduct business with the Federal Government. There is NO fee to register for an account. However, you must first have a DUNS number to register your organization with SAM.Gov.'
      },

      {
        Question: 'Who can submit a solution to a Problem?',
        Answer: 'Any organization can submit a solution if they have an active user account. Please remember -- ALL solution submission are <b><u>PRIVATE</u></b>.'
      },

      {
        Question: 'Does GSM protect my IP and PII?',
        Answer: 'GSM keeps personally identifiable information (PII), Solution submissions, individual Problem feedback, and conversation data private. It is never shared with outside parties. Please see our <a href="/privacy">Privacy Policy</a> for additional information.'
      },
    ]
  },

  Help: {
    Title: 'Contact Us',
    Caption: 'Please fill out the form below to contact us. The GSM Helpdesk will assist you within 1 business day.',
    Fields: {
      Name: 'Name',
      Email: 'Email or Phone Number',
      Phone: '',
      Organization: 'Organization Name',
      Issue: 'Issue Description',
      Severity: 'Urgency'
    },
    Buttons: {
      Submit: 'Send'
    }
  },

  Join: {
    Lookup: {
      Title: 'Let&rsquo;s Get Started!',
      Caption: 'We just need some information about your organization first. Start typing to find your organization if it has already signed up, otherwise enter the full name of your Organization and click Enter.',
      Fields: {
        Search: {
          Placeholder: 'Enter Your Organization Name to Start'
        }
      },
      Buttons: {
        Submit: 'ENTER'
      }
    },
    createUserProfile: {
      Title: 'Create User Profile',
      Caption: '',
      Fields: {
        FirstName: {
          Placeholder: 'First Name'
        },
        LastName: {
          Placeholder: 'Last Name'
        },
        Phone: {
          Placeholder: 'Phone Number'
        },
        Email: {
          Label: 'Your email address will be your GSM login ID.',
          Placeholder: 'Email',
        },
        ConfirmEmail: {
          Placeholder: 'Confirm Email'
        }
      },
      Messages: {
        OrganizationExists: 'Organization Name is already in GSM'
      },
      SidebarRight: {
        AccountDetails: 'New Profile Details',
        OrganizationName: 'Organization Name: ',
        BPOC: 'Business Point of Contact:',
        TPOC: 'Technical Point of Contact:'
      },
      Buttons: {
        Submit: 'NEXT'
      }
    },
    TermsOfService: {
      Title: 'GSM Terms of Service',
      Caption: '',
      Buttons: {
        Submit: 'SUBMIT'
      },
      WhatHappensNext: {
        Title: "What Happens Next?",
        Caption: "After you submit your user account request, the Authorized POC for your Organization will be emailed to validate that you are a current employee and are authorized to represent your organization in the GSM platform. Once you have been validated, then you will receive an email that your account has been activated and will contain a link to set your password."
      }
    },
    status: {
      SuccessUserTitle: 'Thank you for creating your user account!',
      SuccessUserCaption: 'Your account must now be activated by your organization POC to ensure that you are authorized to represent your organization. Once it is activated, you will receive an email that allows you to set your password and sign in.  If you have any questions, please contact gsmhelp@geoint.community',

      SuccessOrgTitle: 'Thank you for creating your user account!',
      SuccessOrgCaption: 'You will receive an email that allows you to set your password and sign in.  If you have any questions, please contact gsmhelp@geoint.community',

      ErrorTitle: 'There was an error.  Please contact gsmhelp@geoint.community',
      ErrorCaption: ''
    },
    newOrganization: {
      Title: 'Let&rsquo;s Add Your Organization!',
      Caption: '',
      Radios: {
        RadiosLabel: 'What is your organization type?',
        Radio1: 'Government',
        Radio2: 'Industry',
        Radio3: 'Academic'
      },
      Messages: {
        OrganizationNotFound: 'Your organization is not already part of GSM.'
      },
      Fields: {
        Duns: {
          Placeholder: 'Enter your DUNS Number (9 digits)'
        },
        GovEmail: {
          Placeholder: 'Enter Your .GOV or .MIL Email Address'
        },
        GovEmailRepeat: {
          Placeholder: 'Confirm Your Email Address'
        }
      },
      SidebarRight: {
        BPOC: 'Business Point of Contact:',
        TPOC: 'Technical Point of Contact:',
        DunsText: '<strong>What is a DUNS Number?</strong><p> If you are a contractor or other non-government employee,' +
        ' this is the 9 digit identification of your company or organization. The DUNS Number was incorporated into' +
        ' the Federal Acquisition Regulation (FAR) in April 1998 as the Federal Government\'s contractor' +
        ' identification code.</p>' +
        '<strong>Don\'t know your DUNS Number?</strong><p>You can <a href="https://www.sam.gov/" target="_blank">find it in the SAM.Gov database</a>' +
        ' by following the link and selecting "Search Records."</p>' +
        '<strong>Don\'t have a DUNS Number?</strong><p>You can <a href="http://fedgov.dnb.com/webform" target="_blank">request one here.</a> It is free of charge.</p>',
        EmailText: '<strong>A .GOV or .MIL Email is Required</strong><p>You must have a valid .GOV or .MIL email address in order to signup as a Government user.<br>',
        RoleText: '<p><strong>Please provide basic details for your organization.</strong></p>' +
        '<p>Once the initial signup process is complete, you will have the opportunity to enhance your organization profile with a full description and screenshots, and you will have the ability to add capabilities to the GSM catalog.</p>'
      },
      Buttons: {
        Submit: 'NEXT',
        DoNotHaveDunsLink: 'I don\'t have one'
      }
    }
  },

  Emails: {
    newsPostAlert: {
      subject: 'News Article Published in GSM',
      text: 'Hello {0},  \n\n A news article was recently published in GSM. You can view the article below. \n\n {1} \n\nRegards,\nThe GSM Team\ngsmhelp@geoint.community',//NOTE : Don't take out {0}. Where username goes
      html: 'Hello {0},  </br></br> A news article was recently published in GSM. You can view the article below. </br></br> {1} <br><br>Regards,<br>The GSM Team<br>gsmhelp@geoint.community'
    },
    newUser: {
      subject: 'New User Submitted',
      text: '{0} has requested access to the system',//NOTE : Don't take out {0}. Where username goes
      html: ''
    },
    waitingApprovalToPOC: {
      subject: 'New User awaiting approval ({0} days pending)',//NOTE:
      text: '{0} has requested access to GSM',
      html: '' //BHughes-THIS IS OBE--
    },
    waitingApprovalToUser: {
      subject: 'GSM User Account Update',
      text: 'Your organizations business POC ({0}) has been reminded of your user account request.',//NOTE: {0}: business POC email
      html: ''//BHughes-THIS IS OBE--
    },
    morethenThirtyDayEmailToHelpDesk: {
      subject: 'New User awaiting approval for more then 30 days',
      text: ' {0} has requested access to GSM {1} days ago',//NOTE: {0}: username, {1}: day count
      html: ''//BHughes-THIS IS OBE--
    },
    morethenThirtyDayEmailToUser: {
      subject: 'GSM User Account Request Update',
      text: 'Your account has not yet been activated by your Organization POC after 30 days. At this point, we will conduct a manual review to investigate the issue. Please standby or reply to this email if you have questions.\n\nRegards,\nThe GSM Team\ngsmhelp@geoint.community',
      html: ''//BHughes-THIS IS OBE--
    },
    newProblem: {
      subject: 'New Problem Submitted',
      text: '{0} has submitted a new Problem',//NOTE : Don't take out {0}. Where problem name
      html: ''
    },
    userAdminApproved: {
      subject: 'GSM Account Created',
      text: 'Dear {0}:\nThank you for signing up! Your account has been created. Please click the link below to complete your registration and set your password: \n{1}',//NOTE: {0}: Username, {1}: Reset URL
      html: 'Dear {0}:<br/>Thank you for signing up! Your account has been created. Please click the link below to activate your account and set your password: <br/><br/> <a href="{1}">Activate Your Account</a><br><br>Regards,<br>The GSM Team<br>gsmhelp@geoint.community'//NOTE: {0}: Username, {1}: Reset URL
    },
    userAdminDenial: {
      subject: 'GSM Account Not Approved',
      text: 'Dear {0}:\n Your GSM account request was not approved. Please contact your Organization Manager or the GSM Helpdesk if this action was made in error. You will need to re-signup if this was an error.\n\nRegards,\nThe GSM Team\ngsmhelp@geoint.community',//NOTE: {0}: Username
      html: 'Dear {0}:<br/>Your GSM account request was not approved. Please contact your Organization Manager or the GSM Helpdesk if this action was made in error. You will need to re-signup if this was an error.<br><br>Regards,<br>The GSM Team<br>gsmhelp@geoint.community'//NOTE: {0}: Username
    },
    userPasswordReset: {
      subject: 'GSM Password Reset',
      //NOTE: {0}: Reset URL
      text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\nPlease click on the following link, or paste this into your browser to complete the process:\n\n{0}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.\n\nRegards,\nThe GSM Team\ngsmhelp@geoint.community',
      html: ''
    },
    feedbackEmail: {
      subject: 'Feedback on your Solution',
      text: 'Dear {0},\n\n Feedback has been given on your Solution for {1}. Please sign in to GSM to view the feedback at https://www.geoint.community/signin \n\nRegards,\nThe GSM Team\ngsmhelp@geoint.community',//NOTE: {0}:username, {1}: problem name
      html: 'Dear {0},<br/><br/> Feedback has been given on your Solution for {1}. Please sign in to GSM to view the feedback at <a href="https://www.geoint.community/signin">https://www.geoint.community/signin</a><br/><br/>Regards,<br/>The GSM Team<br>gsmhelp@geoint.community'
    },
	  registerConfirmation: {
      subject: 'Successful Solution submission for {1}',
      text: 'Dear {0},\n You have successfully submitted your solution to: {1}. \nYou may edit or view your solution by: Signing in -> clicking your name in the top right corner -> My Dashboard -> My Problem Solutions. \n\nRegards,\nThe GSM Team\ngsmhelp@geoint.community',//NOTE: {0}:username, {1}: problem name
      html: 'Dear {0},<br/> You have successfully submitted your solution to: {1}. <br/>You may edit or view your solution by: Signing in -> clicking your name in the top right corner -> My Dashboard -> My Problem Solutions.<br/><br/>Regards,<br/>The GSM Team<br/>gsmhelp@geoint.community'
    },
    pocVerifyNewUserJoin: {
      subject: 'Action required: User Request to Join GSM',
      text: 'Dear {0}:\n\nA new user ({2}) has requested an account at https://www.geoint.community. \n\nYour action is required because each user in the GSM platform is representing their organization and in order to prevent identity fraud, they must be authenticated by an authorized representative from the organization they are requesting to represent. \n\nPlease verify the following details and if valid, please follow this link to approve their access to the site:\n{1}\n\nUser\'s Information:\nName: {2}\nEmail: {3}\nPhone: {4}\n\nRegards,\nThe GSM Team\ngsmhelp@geoint.community',
      html: 'Dear {0}:<br><br>A new user ({2}) has requested an account at <a href="https://www.geoint.community">https://www.geoint.community</a>. Your action is required because each user in the GSM platform is representing their organization and in order to prevent identity fraud, they must be authenticated by an authorized representative from the organization they are requesting to represent.<br><br>Please verify the following details and if valid, please follow this link to approve their access to the website:<br>{1}<br><br>User\'s Information:<br>Name: {2}<br>Email: {3}<br>Phone: {4}<br><br>Regards,<br>The GSM Team<br>gsmhelp@geoint.community'
    },
    newCommunityMessageHelpDesk: {
      subject: 'ACTION - New Community Request',
      text: '{0} has requested to start a new community\n\n Community Name: {1}\n Description: {2}\n\n Please review this request and take action immediately!',//NOTE : {0}: User, {1}: community name, {2}: community description
      html: '{0} has requested to start a new community<br><br>Community Name: {1}<br>Description: {2}<br><br> Please review this request and take action immediately!'//NOTE : {0}: User, {1}: community name, {2}: community description
    },
    joinCommunityReminder: {
      subject: 'Join a community!',
      text: 'Thanks for signing up!\n\nWhat\'s next? Join a Community!\n\nWhen you join a Community you may participate in Problems, get invited to Private Conversations, and have your Organization featured in the Community Members and Capability Catalog sections.\n\nCome and join one today: https://geoint.community/community\n\n',
      html: ''
    }
  },
  Organization: {
    RoleDescription: {
      Client: 'I Have Market Research Needs',
      Provider: 'I Have Capabilities',
      Both: 'I Have Capabilities and Market Research Needs',
      CommunityOwner: 'I Want To Create a Community'
    },
    TypeDescription: {
      Government: '',
      Industry: '',
      Academia: ''
    },
    notDisplayAbleMessage: '\n All required fields must be complete.'
  },

};
