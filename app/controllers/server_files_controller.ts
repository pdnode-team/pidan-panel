import McServer from '#models/mc_server'
import ServerFileManagerService from '#services/server_file_manager_service'
import {
  saveServerFileValidator,
  uploadServerFileValidator,
  renameServerFileValidator,
} from '#validators/server_file'
import ServerFileTransformer from '#transformers/server_file_transformer'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class ServerFilesController {
  constructor(protected fileManager: ServerFileManagerService) {}

  /**
   * List files and folders in directory
   */
  async index({ params, request, response, serialize }: HttpContext) {
    const server = await McServer.findOrFail(params.id)
    const relativePath = request.input('path', '')

    try {
      const items = await this.fileManager.listDirectory(server, relativePath)
      return serialize(ServerFileTransformer.transform(items))
    } catch (error: any) {
      return response.badRequest({
        errors: [{ message: error.message || 'Failed to list directory' }],
      })
    }
  }

  /**
   * Read text file contents
   */
  async show({ params, request, response, serialize }: HttpContext) {
    const server = await McServer.findOrFail(params.id)
    const relativePath = request.input('path')
    if (!relativePath) {
      return response.badRequest({
        errors: [{ message: 'Query parameter "path" is required' }],
      })
    }

    try {
      const result = await this.fileManager.readFile(server, relativePath)
      return serialize(result)
    } catch (error: any) {
      return response.badRequest({
        errors: [{ message: error.message || 'Failed to read file' }],
      })
    }
  }

  /**
   * Create/save file content or upload a file
   */
  async store({ params, request, response, serialize }: HttpContext) {
    const server = await McServer.findOrFail(params.id)

    // Check if multipart file upload
    const file = request.file('file')
    if (file) {
      const payload = await request.validateUsing(uploadServerFileValidator)
      try {
        await this.fileManager.uploadFile(server, payload.path || '', payload.file)
        return response.created(
          await serialize({
            success: true,
            message: `File "${payload.file.clientName}" uploaded successfully`,
          })
        )
      } catch (error: any) {
        return response.badRequest({
          errors: [{ message: error.message || 'Failed to upload file' }],
        })
      }
    }

    // Otherwise text file save
    const payload = await request.validateUsing(saveServerFileValidator)
    try {
      await this.fileManager.writeFile(server, payload.path, payload.content)
      return response.created(
        await serialize({
          success: true,
          message: `File "${payload.path}" saved successfully`,
        })
      )
    } catch (error: any) {
      return response.badRequest({
        errors: [{ message: error.message || 'Failed to save file' }],
      })
    }
  }

  /**
   * Rename or move file
   */
  async update({ params, request, response, serialize }: HttpContext) {
    const server = await McServer.findOrFail(params.id)
    const payload = await request.validateUsing(renameServerFileValidator)

    try {
      await this.fileManager.renameFile(server, payload.oldPath, payload.newPath)
      return serialize({
        success: true,
        message: 'File renamed successfully',
      })
    } catch (error: any) {
      return response.badRequest({
        errors: [{ message: error.message || 'Failed to rename file' }],
      })
    }
  }

  /**
   * Delete file or directory
   */
  async destroy({ params, request, response }: HttpContext) {
    const server = await McServer.findOrFail(params.id)
    const relativePath = request.input('path')
    if (!relativePath) {
      return response.badRequest({
        errors: [{ message: 'Query parameter "path" is required' }],
      })
    }

    try {
      await this.fileManager.deleteFile(server, relativePath)
      return response.noContent()
    } catch (error: any) {
      return response.badRequest({
        errors: [{ message: error.message || 'Failed to delete file' }],
      })
    }
  }
}
