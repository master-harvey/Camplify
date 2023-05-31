//https://docs.amplify.aws/lib/client-configuration/configuring-amplify-categories/q/platform/js/
export const cdkExports = {
  aws_project_region: awsExports.REGION, // (optional) Default region for project


  
  Auth: {
    // (required) only for Federated Authentication - Amazon Cognito Identity Pool ID
    identityPoolId: awsExports.IDPID,

    // (required)- Amazon Cognito Region
    region: awsExports.REGION,

    // (optional) - Amazon Cognito Federated Identity Pool Region
    // Required only if it's different from Amazon Cognito Region
    //identityPoolRegion: 'XX-XXXX-X',

    // (optional) - Amazon Cognito User Pool ID
    userPoolId: awsExports.UPID,

    // (optional) - Amazon Cognito Web Client ID (26-char alphanumeric string, App client secret needs to be disabled)
    userPoolWebClientId: awsExports.WCID,

    // (optional) - Enforce user authentication prior to accessing AWS resources or not
    //mandatorySignIn: false,

    // (optional) - Configuration for cookie storage
    // Note: if the secure flag is set to true, then the cookie transmission requires a secure protocol
    // cookieStorage: {
    //   // - Cookie domain (only required if cookieStorage is provided)
    //   domain: '.yourdomain.com',
    //   // (optional) - Cookie path
    //   path: '/',
    //   // (optional) - Cookie expiration in days
    //   expires: 365,
    //   // (optional) - See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite
    //   sameSite: 'strict', // 'lax',
    //   // (optional) - Cookie secure flag
    //   // Either true or false, indicating if the cookie transmission requires a secure protocol (https).
    //   secure: true
    // },

    // (optional) - customized storage object
    //storage: {},

    // (optional) - Manually set the authentication flow type. Default is 'USER_SRP_AUTH'
    authenticationFlowType: 'USER_PASSWORD_AUTH',

    // (optional) - Manually set key value pairs that can be passed to Cognito Lambda Triggers
    //clientMetadata: { myCustomKey: 'myCustomValue' },

    // (optional) - Hosted UI configuration
    oauth: {
      domain: 'your_cognito_domain',
      scope: [
        'phone',
        'email',
        'profile',
        'openid',
        'aws.cognito.signin.user.admin'
      ],
      // redirectSignIn: 'http://localhost:3000/',
      // redirectSignOut: 'http://localhost:3000/',
      clientId: awsExports.WCID,
      responseType: 'code' // or 'token', note that REFRESH token will only be generated when the responseType is code
    }
  },



  Storage: {
    AWSS3: {
      bucket: awsExports.STORAGEBUCKET, // (required) -  Amazon S3 bucket name
      region: awsExports.REGION // (optional) -  Amazon service region
    }
  },



  API: { // GRAPHQL API's
    graphql_endpoint: 'https:/www.example.com/my-graphql-endpoint',
    graphql_headers: async () => ({
      'My-Custom-Header': 'my value' // Set Custom Request Headers for non-AppSync GraphQL APIs
    })
  },


  
  aws_cloud_logic_custom: [ // REST API's
    {
      name: 'your-api-name', // (required) - API Name (This name is used used in the client app to identify the API - API.get('your-api-name', '/path'))
      endpoint: 'https://gfz59k9rlj.execute-api.us-east-1.amazonaws.com/dev', // (required) -API Gateway URL + environment
      region: 'us-east-1' // (required) - API Gateway region
    }
  ],

  

  predictions: {
    convert: {
      translateText: {
        region: 'us-east-1',
        proxy: false,
        defaults: {
          sourceLanguage: 'en',
          targetLanguage: 'zh'
        }
      },
      speechGenerator: {
        region: 'us-east-1',
        proxy: false,
        defaults: {
          VoiceId: 'Ivy',
          LanguageCode: 'en-US'
        }
      },
      transcription: {
        region: 'us-east-1',
        proxy: false,
        defaults: {
          language: 'en-US'
        }
      }
    },
    identify: {
      identifyText: {
        proxy: false,
        region: 'us-east-1',
        defaults: {
          format: 'PLAIN'
        }
      },
      identifyEntities: {
        proxy: false,
        region: 'us-east-1',
        celebrityDetectionEnabled: true,
        defaults: {
          collectionId: 'identifyEntities8b89c648-test',
          maxEntities: 50
        }
      },
      identifyLabels: {
        proxy: false,
        region: 'us-east-1',
        defaults: {
          type: 'LABELS'
        }
      }
    },
    interpret: {
      interpretText: {
        region: 'us-east-1',
        proxy: false,
        defaults: {
          type: 'ALL'
        }
      }
    }
  },

  

  Interactions: {
    bots: {
      BookTrip: {
        name: 'BookTrip',
        alias: '$LATEST',
        region: 'us-east-1'
      }
    }
  },


  
  Analytics: {
    // - disable Analytics if true
    disabled: false,
    // (optional) - Allow recording session events. Default is true.
    autoSessionRecord: true,

    AWSPinpoint: {
      // (optional) -  Amazon Pinpoint App Client ID
      appId: 'XXXXXXXXXXabcdefghij1234567890ab',
      // (optional) -  Amazon service region
      region: 'XX-XXXX-X',
      // (optional) -  Customized endpoint
      endpointId: 'XXXXXXXXXXXX',
      // (optional) - Default Endpoint Information
      endpoint: {
        address: 'xxxxxxx', // The unique identifier for the recipient. For example, an address could be a device token, email address, or mobile phone number.
        attributes: {
          // Custom attributes that your app reports to Amazon Pinpoint. You can use these attributes as selection criteria when you create a segment.
          hobbies: ['piano', 'hiking']
        },
        channelType: 'APNS', // The channel type. Valid values: APNS, GCM
        demographic: {
          appVersion: 'xxxxxxx', // The version of the application associated with the endpoint.
          locale: 'xxxxxx', // The endpoint locale in the following format: The ISO 639-1 alpha-2 code, followed by an underscore, followed by an ISO 3166-1 alpha-2 value
          make: 'xxxxxx', // The manufacturer of the endpoint device, such as Apple or Samsung.
          model: 'xxxxxx', // The model name or number of the endpoint device, such as iPhone.
          modelVersion: 'xxxxxx', // The model version of the endpoint device.
          platform: 'xxxxxx', // The platform of the endpoint device, such as iOS or Android.
          platformVersion: 'xxxxxx', // The platform version of the endpoint device.
          timezone: 'xxxxxx' // The timezone of the endpoint. Specified as a tz database value, such as Americas/Los_Angeles.
        },
        location: {
          city: 'xxxxxx', // The city where the endpoint is located.
          country: 'xxxxxx', // The two-letter code for the country or region of the endpoint. Specified as an ISO 3166-1 alpha-2 code, such as "US" for the United States.
          latitude: 0, // The latitude of the endpoint location, rounded to one decimal place.
          longitude: 0, // The longitude of the endpoint location, rounded to one decimal place.
          postalCode: 'xxxxxx', // The postal code or zip code of the endpoint.
          region: 'xxxxxx' // The region of the endpoint location. For example, in the United States, this corresponds to a state.
        },
        metrics: {
          // Custom metrics that your app reports to Amazon Pinpoint.
        },
        /** Indicates whether a user has opted out of receiving messages with one of the following values:
         * ALL - User has opted out of all messages.
         * NONE - Users has not opted out and receives all messages.
         */
        optOut: 'ALL',
        // Customized userId
        userId: 'XXXXXXXXXXXX',
        // User attributes
        userAttributes: {
          interests: ['football', 'basketball', 'AWS']
          // ...
        }
      },

      // Buffer settings used for reporting analytics events.
      // (optional) - The buffer size for events in number of items.
      bufferSize: 1000,

      // (optional) - The interval in milliseconds to perform a buffer check and flush if necessary.
      flushInterval: 5000, // 5s

      // (optional) - The number of events to be deleted from the buffer when flushed.
      flushSize: 100,

      // (optional) - The limit for failed recording retries.
      resendLimit: 5
    }
  },


  
  geo: {
    AmazonLocationService: {
      maps: {
        items: {
          XXXXXXXXXXX: {
            // REQUIRED - Amazon Location Service Map resource name
            style: 'VectorEsriStreets' // REQUIRED - String representing the style of map resource
          }
        },
        default: 'XXXXXXXXXXX' // REQUIRED - Amazon Location Service Map resource name to set as default
      },
      search_indices: {
        items: ['XXXXXXXXX'], // REQUIRED - Amazon Location Service Place Index name
        default: 'XXXXXXXXX' // REQUIRED - Amazon Location Service Place Index name to set as default
      },
      region: 'XX-XXXX-X' // REQUIRED - Amazon Location Service Region
    }
  }

}