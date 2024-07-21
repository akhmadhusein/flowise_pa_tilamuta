import { INodeParams, INodeCredential } from '../src/Interface'

class MeilisearchApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Meilisearch API'
        this.name = 'meiliSearchApi'
        this.version = 1.0
        this.description =
            'Refer to <a target="_blank" href="https://meilisearch.com">official guide</a> on how to get an API Key, you need a search API KEY for basic searching functionality, admin API KEY is optional but needed for upsert functionality '
        this.inputs = [
            {
                label: 'Meilisearch Admin API KEY',
                name: 'meilisearchAdminApiKey',
                type: 'password',
                optional: true
            },
            {
                label: 'Meilisearch Search API KEY',
                name: 'meilisearchSearchApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: MeilisearchApi }
