import { buildURL } from '../utils/helpers'
import BaseExtend from '../extends/base'

class DataEntriesEndpoint extends BaseExtend {
  RelatedDataEntries(token = null) {
    const { limit, offset, filter } = this

    this.call = this.request.send(
      buildURL(`personal-data/related-data-entries`, {
        limit,
        offset,
        filter
      }),
      'GET',
      undefined,
      token,
      this
    )

    return this.call
  }
}

export default DataEntriesEndpoint
