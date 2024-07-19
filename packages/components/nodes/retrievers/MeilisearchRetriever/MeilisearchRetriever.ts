import { getCredentialData, getCredentialParam } from '../../../src'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { Meilisearch } from 'meilisearch'
import { MeilisearchRetriever } from './Meilisearch'
import { flatten } from 'lodash'
import { Document } from '@langchain/core/documents'
import { v4 as uuidv4 } from 'uuid'
import { Embeddings } from '@langchain/core/embeddings'

class MeilisearchRetriever_node implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams
    badge: string
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Meilisearch retriever'
        this.name = 'Meilisearch retriever'
        this.version = 1.0
        this.type = 'Meilisearch'
        this.icon = 'Meilisearch.png'
        this.category = 'Vector Stores'
        this.badge = 'NEW'
        this.description = 'Meilisearch uses hybrid search to sematically answer the query.'
        this.baseClasses = ['BaseRetriever']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: [this.type, 'MeilisearchApi']
        }
        this.inputs = [
            {
                label: 'Document',
                name: 'document',
                type: 'Document',
                list: true,
                optional: true
            },
            {
                label: 'Embeddings',
                name: 'embeddings',
                type: 'Embeddings'
            },
            {
                label: 'host',
                name: 'host',
                type: 'string',
                description: 'This is the URL for the desired Meilisearch instance'
            },
            {
                label: 'indexUid',
                name: 'indexUid',
                type: 'string',
                description: 'UID for the index to answer from'
            },
            {
                label: 'Top K',
                name: 'K',
                type: 'number',
                description: 'number of top searches to return as context',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Semantic Ratio',
                name: 'semanticRatio',
                type: 'number',
                description: 'percentage of sematic reasoning in meilisearch hybrid search',
                additionalParams: true,
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'Meilisearch Retriever',
                name: 'meilisearch retriever',
                description: 'retrieve answers',
                baseClasses: this.baseClasses
            },
            {
                label: 'another output',
                name: 'meilisearch documents',
                description: 'return documents containing pageContent and metadata',
                baseClasses: ['Document', 'json']
            }
        ]
    }
    //@ts-ignore
    vectorStoreMethods = {
        async upsert(nodeData: INodeData, options: ICommonObject): Promise<any> {
            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const meilisearchAdminApiKey = getCredentialParam('adminApiKey', credentialData, nodeData)
            const docs = nodeData.inputs?.document as Document[]
            const host = nodeData.inputs?.host as string
            const indexUid = nodeData.inputs?.indexUid as string
            const embeddings = nodeData.inputs?.embeddings as Embeddings
            let embeddingDimension: number = 384
            const client = new Meilisearch({
                host: host,
                apiKey: meilisearchAdminApiKey
            })
            const flattenDocs = docs && docs.length ? flatten(docs) : []
            const finalDocs = []
            for (let i = 0; i < flattenDocs.length; i += 1) {
                if (flattenDocs[i] && flattenDocs[i].pageContent) {
                    const uniqueId = uuidv4()
                    const { pageContent, metadata } = flattenDocs[i]
                    const docEmbedding = await embeddings.embedQuery(pageContent)
                    embeddingDimension = docEmbedding.length
                    const documentForIndexing = {
                        pageContent,
                        metadata,
                        objectID: uniqueId,
                        _vectors: {
                            ollama: {
                                embeddings: docEmbedding,
                                regenerate: false
                            }
                        }
                    }
                    finalDocs.push(documentForIndexing)
                }
            }
            let index: any
            try {
                index = await client.getIndex(indexUid)
            } catch (error) {
                console.error('Error fetching index:', error)
                await client.createIndex(indexUid, { primaryKey: 'objectID' })
            } finally {
                index = await client.getIndex(indexUid)
            }

            try {
                await index.updateSettings({
                    embedders: {
                        ollama: {
                            source: 'userProvided',
                            dimensions: embeddingDimension
                        }
                    }
                })
                await index.addDocuments(finalDocs)
            } catch (error) {
                console.error('Error occurred while adding documents:', error)
            }
            return
        }
    }
    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const meilisearchSearchApiKey = getCredentialParam('searchApiKey', credentialData, nodeData)
        const host = nodeData.inputs?.host as string
        const indexUid = nodeData.inputs?.indexUid as string
        const K = nodeData.inputs?.K as string
        const semanticRatio = nodeData.inputs?.semanticRatio as string
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const output = nodeData.outputs?.output as string

        const hybridsearchretriever = new MeilisearchRetriever(host, meilisearchSearchApiKey, indexUid, K, semanticRatio, embeddings)
        if (output == 'meilisearch retriever') {
            return hybridsearchretriever
        } else {
            return hybridsearchretriever //TODO
        }
    }
}
module.exports = { nodeClass: MeilisearchRetriever_node }
