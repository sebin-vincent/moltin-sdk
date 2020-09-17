import { buildRequestBody, parseJSON, resetProps } from '../utils/helpers'

class Credentials {
  constructor(client_id, access_token, expires) {
    this.client_id = client_id
    this.access_token = access_token
    this.expires = expires
  }

  toObject() {
    return {
      client_id: this.client_id,
      access_token: this.access_token,
      expires: this.expires
    }
  }
}

class RequestFactory {
  constructor(config) {
    this.config = config
    this.storage = config.storage
  }

  authenticate() {
    const { config, storage } = this

    if (!config.client_id) {
      throw new Error('You must have a client_id set')
    }

    if (!config.host) {
      throw new Error('You have not specified an API host')
    }

    const body = {
      grant_type: config.client_secret ? 'client_credentials' : 'implicit',
      client_id: config.client_id
    }

    if (config.client_secret) {
      body.client_secret = config.client_secret
    }

    console.log('about to authenticate using the SDK!')

    const promise = new Promise((resolve, reject) => {
      console.log(`${config.protocol}://${config.host}/${config.auth.uri}`)
      console.log(`${body.grant_type}`)
      console.log(`${body.client_id}`)
      console.log(`${body.client_secret}`)
      config.auth.fetch
        .bind()(`${config.protocol}://${config.host}/${config.auth.uri}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-MOLTIN-SDK-LANGUAGE': config.sdk.language,
            'X-MOLTIN-SDK-VERSION': config.sdk.version
          },
          body: Object.keys(body)
            .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(body[k])}`)
            .join('&')
        })
        .then(parseJSON)
        .then(response => {
          console.log(response)
          if (response.ok) {
            console.log(response.json)
            resolve(response.json)
          }

          reject(response.json)
        })
        .catch(error => reject(error))
    })

    promise
      .then(response => {
        const credentials = new Credentials(
          config.client_id,
          response.access_token,
          response.expires
        )
        storage.set('moltinCredentials', JSON.stringify(credentials))
      })
      .catch(() => {})

    return promise
  }

  send(uri, method, body = undefined, token = undefined, instance) {
    const { config, storage } = this

    const promise = new Promise((resolve, reject) => {
      const credentials = JSON.parse(storage.get('moltinCredentials'))

      const req = cred => {
        const access_token = cred ? cred.access_token : null

        const headers = {
          'Content-Type': 'application/json',
          'X-MOLTIN-SDK-LANGUAGE': config.sdk.language,
          'X-MOLTIN-SDK-VERSION': config.sdk.version
        }

        if (access_token) {
          headers.Authorization = `Bearer: ${access_token}`
        }

        if (config.store_id) {
          headers['X-MOLTIN-AUTH-STORE'] = config.store_id
        }

        headers['X-MOLTIN-APPLICATION'] = config.application
          ? config.application
          : 'epcc sdk'

        if (config.currency) {
          headers['X-MOLTIN-CURRENCY'] = config.currency
        }

        if (config.language) {
          headers['X-MOLTIN-LANGUAGE'] = config.language
        }

        if (token) {
          headers['X-MOLTIN-CUSTOMER-TOKEN'] = token
        }

        fetch(`${config.protocol}://${config.host}/${config.version}/${uri}`, {
          method: method.toUpperCase(),
          headers,
          body: buildRequestBody(body)
        })
          .then(parseJSON)
          .then(response => {
            if (response.ok) {
              resolve(response.json)
            }
            reject(response.json)
          })
          .catch(error => reject(error))
      }

      if (
        (!credentials ||
          !credentials.access_token ||
          credentials.client_id !== config.client_id ||
          Math.floor(Date.now() / 1000) >= credentials.expires) &&
        !config.store_id
      ) {
        return this.authenticate()
          .then(() => req(JSON.parse(storage.get('moltinCredentials'))))
          .catch(error => reject(error))
      }
      return req(credentials)
    })

    if (instance) resetProps(instance)

    return promise
  }
}

export default RequestFactory
