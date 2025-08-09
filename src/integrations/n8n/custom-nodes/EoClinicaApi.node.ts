import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeApiError,
  NodeOperationError,
} from 'n8n-workflow';
import axios from 'axios';

/**
 * Custom N8N Node for EO Clínica API Integration
 * Provides seamless integration with the clinic's core API endpoints
 */
export class EoClinicaApi implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'EO Clínica API',
    name: 'eoClinicaApi',
    group: ['transform'],
    version: 1,
    description: 'Interact with EO Clínica medical scheduling system API',
    defaults: {
      name: 'EO Clínica API',
      color: '#1f77b4',
    },
    icon: 'file:eoclinica.svg',
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'eoClinicaApi',
        required: true,
      },
    ],
    properties: [
      // Resource selection
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Appointment',
            value: 'appointment',
          },
          {
            name: 'Patient',
            value: 'patient',
          },
          {
            name: 'Doctor',
            value: 'doctor',
          },
          {
            name: 'Availability',
            value: 'availability',
          },
          {
            name: 'Queue',
            value: 'queue',
          },
          {
            name: 'Notification',
            value: 'notification',
          },
          {
            name: 'AI Chat',
            value: 'aiChat',
          },
        ],
        default: 'appointment',
      },

      // Appointment Operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ['appointment'],
          },
        },
        options: [
          {
            name: 'Create',
            value: 'create',
            description: 'Create a new appointment',
            action: 'Create an appointment',
          },
          {
            name: 'Get',
            value: 'get',
            description: 'Get an appointment by ID',
            action: 'Get an appointment',
          },
          {
            name: 'Update',
            value: 'update',
            description: 'Update an existing appointment',
            action: 'Update an appointment',
          },
          {
            name: 'Delete',
            value: 'delete',
            description: 'Cancel an appointment',
            action: 'Cancel an appointment',
          },
          {
            name: 'List',
            value: 'list',
            description: 'List appointments with filters',
            action: 'List appointments',
          },
          {
            name: 'Confirm',
            value: 'confirm',
            description: 'Confirm an appointment',
            action: 'Confirm an appointment',
          },
          {
            name: 'Reschedule',
            value: 'reschedule',
            description: 'Reschedule an appointment',
            action: 'Reschedule an appointment',
          },
        ],
        default: 'create',
      },

      // Patient Operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ['patient'],
          },
        },
        options: [
          {
            name: 'Create',
            value: 'create',
            description: 'Create a new patient',
            action: 'Create a patient',
          },
          {
            name: 'Get',
            value: 'get',
            description: 'Get a patient by ID',
            action: 'Get a patient',
          },
          {
            name: 'Update',
            value: 'update',
            description: 'Update patient information',
            action: 'Update a patient',
          },
          {
            name: 'Search',
            value: 'search',
            description: 'Search patients',
            action: 'Search patients',
          },
        ],
        default: 'create',
      },

      // Availability Operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ['availability'],
          },
        },
        options: [
          {
            name: 'Check',
            value: 'check',
            description: 'Check availability for a time slot',
            action: 'Check availability',
          },
          {
            name: 'List',
            value: 'list',
            description: 'List available slots',
            action: 'List available slots',
          },
          {
            name: 'Block',
            value: 'block',
            description: 'Block a time slot',
            action: 'Block time slot',
          },
          {
            name: 'Unblock',
            value: 'unblock',
            description: 'Unblock a time slot',
            action: 'Unblock time slot',
          },
        ],
        default: 'check',
      },

      // Queue Operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ['queue'],
          },
        },
        options: [
          {
            name: 'Add',
            value: 'add',
            description: 'Add patient to waiting queue',
            action: 'Add to queue',
          },
          {
            name: 'Remove',
            value: 'remove',
            description: 'Remove patient from queue',
            action: 'Remove from queue',
          },
          {
            name: 'List',
            value: 'list',
            description: 'List queue for specialty',
            action: 'List queue',
          },
          {
            name: 'Notify',
            value: 'notify',
            description: 'Notify next in queue',
            action: 'Notify queue',
          },
        ],
        default: 'add',
      },

      // AI Chat Operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ['aiChat'],
          },
        },
        options: [
          {
            name: 'Send Message',
            value: 'sendMessage',
            description: 'Send a message to AI assistant',
            action: 'Send message to AI',
          },
          {
            name: 'Get Conversation',
            value: 'getConversation',
            description: 'Get conversation history',
            action: 'Get conversation',
          },
        ],
        default: 'sendMessage',
      },

      // Common Fields
      {
        displayName: 'Appointment ID',
        name: 'appointmentId',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            resource: ['appointment'],
            operation: ['get', 'update', 'delete', 'confirm', 'reschedule'],
          },
        },
        default: '',
        description: 'The ID of the appointment',
      },

      {
        displayName: 'Patient ID',
        name: 'patientId',
        type: 'string',
        displayOptions: {
          show: {
            resource: ['appointment'],
            operation: ['create', 'update'],
          },
        },
        default: '',
        description: 'The ID of the patient',
      },

      {
        displayName: 'Doctor ID',
        name: 'doctorId',
        type: 'string',
        displayOptions: {
          show: {
            resource: ['appointment'],
            operation: ['create', 'update'],
          },
        },
        default: '',
        description: 'The ID of the doctor',
      },

      {
        displayName: 'Specialty ID',
        name: 'specialtyId',
        type: 'string',
        displayOptions: {
          show: {
            resource: ['appointment', 'availability', 'queue'],
            operation: ['create', 'check', 'list', 'add'],
          },
        },
        default: '',
        description: 'The ID of the medical specialty',
      },

      {
        displayName: 'Date',
        name: 'date',
        type: 'dateTime',
        displayOptions: {
          show: {
            resource: ['appointment', 'availability'],
            operation: ['create', 'check', 'list', 'reschedule'],
          },
        },
        default: '',
        description: 'The appointment date and time',
      },

      {
        displayName: 'Duration (minutes)',
        name: 'duration',
        type: 'number',
        displayOptions: {
          show: {
            resource: ['appointment'],
            operation: ['create', 'update'],
          },
        },
        default: 30,
        description: 'Duration of the appointment in minutes',
      },

      {
        displayName: 'Priority',
        name: 'priority',
        type: 'options',
        options: [
          { name: 'Low', value: 'LOW' },
          { name: 'Medium', value: 'MEDIUM' },
          { name: 'High', value: 'HIGH' },
          { name: 'Emergency', value: 'EMERGENCY' },
        ],
        displayOptions: {
          show: {
            resource: ['appointment', 'queue'],
            operation: ['create', 'update', 'add'],
          },
        },
        default: 'MEDIUM',
        description: 'Priority level of the appointment',
      },

      {
        displayName: 'Notes',
        name: 'notes',
        type: 'string',
        typeOptions: {
          rows: 3,
        },
        displayOptions: {
          show: {
            resource: ['appointment'],
            operation: ['create', 'update'],
          },
        },
        default: '',
        description: 'Additional notes for the appointment',
      },

      {
        displayName: 'Message',
        name: 'message',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            resource: ['aiChat'],
            operation: ['sendMessage'],
          },
        },
        default: '',
        description: 'Message to send to AI assistant',
      },

      {
        displayName: 'Additional Fields',
        name: 'additionalFields',
        type: 'collection',
        placeholder: 'Add Field',
        default: {},
        options: [
          {
            displayName: 'Send Notifications',
            name: 'sendNotifications',
            type: 'boolean',
            default: true,
            description: 'Whether to send notifications for this action',
          },
          {
            displayName: 'Update Calendar',
            name: 'updateCalendar',
            type: 'boolean',
            default: true,
            description: 'Whether to update external calendars',
          },
          {
            displayName: 'Reason',
            name: 'reason',
            type: 'string',
            default: '',
            description: 'Reason for cancellation or rescheduling',
          },
        ],
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    const credentials = await this.getCredentials('eoClinicaApi');
    const baseUrl = credentials.baseUrl as string;
    const apiKey = credentials.apiKey as string;

    const client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    for (let i = 0; i < items.length; i++) {
      try {
        const resource = this.getNodeParameter('resource', i) as string;
        const operation = this.getNodeParameter('operation', i) as string;
        
        let responseData;

        if (resource === 'appointment') {
          responseData = await this.executeAppointmentOperation(client, operation, i);
        } else if (resource === 'patient') {
          responseData = await this.executePatientOperation(client, operation, i);
        } else if (resource === 'availability') {
          responseData = await this.executeAvailabilityOperation(client, operation, i);
        } else if (resource === 'queue') {
          responseData = await this.executeQueueOperation(client, operation, i);
        } else if (resource === 'aiChat') {
          responseData = await this.executeAiChatOperation(client, operation, i);
        }

        returnData.push({
          json: responseData,
          pairedItem: { item: i },
        });

      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: { error: error.message },
            pairedItem: { item: i },
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }

  private async executeAppointmentOperation(
    client: any,
    operation: string,
    itemIndex: number
  ): Promise<any> {
    switch (operation) {
      case 'create':
        const createData = {
          patientId: this.getNodeParameter('patientId', itemIndex),
          doctorId: this.getNodeParameter('doctorId', itemIndex),
          specialtyId: this.getNodeParameter('specialtyId', itemIndex),
          date: this.getNodeParameter('date', itemIndex),
          duration: this.getNodeParameter('duration', itemIndex, 30),
          priority: this.getNodeParameter('priority', itemIndex, 'MEDIUM'),
          notes: this.getNodeParameter('notes', itemIndex, ''),
        };
        const createResponse = await client.post('/api/appointments', createData);
        return createResponse.data;

      case 'get':
        const appointmentId = this.getNodeParameter('appointmentId', itemIndex);
        const getResponse = await client.get(`/api/appointments/${appointmentId}`);
        return getResponse.data;

      case 'update':
        const updateId = this.getNodeParameter('appointmentId', itemIndex);
        const updateData = {
          date: this.getNodeParameter('date', itemIndex),
          duration: this.getNodeParameter('duration', itemIndex),
          notes: this.getNodeParameter('notes', itemIndex),
          priority: this.getNodeParameter('priority', itemIndex),
        };
        const updateResponse = await client.put(`/api/appointments/${updateId}`, updateData);
        return updateResponse.data;

      case 'delete':
        const deleteId = this.getNodeParameter('appointmentId', itemIndex);
        await client.delete(`/api/appointments/${deleteId}`);
        return { success: true, message: 'Appointment cancelled successfully' };

      case 'list':
        const listParams = new URLSearchParams();
        if (this.getNodeParameter('specialtyId', itemIndex, '')) {
          listParams.append('specialtyId', this.getNodeParameter('specialtyId', itemIndex));
        }
        if (this.getNodeParameter('date', itemIndex, '')) {
          listParams.append('date', this.getNodeParameter('date', itemIndex));
        }
        const listResponse = await client.get(`/api/appointments?${listParams.toString()}`);
        return listResponse.data;

      case 'confirm':
        const confirmId = this.getNodeParameter('appointmentId', itemIndex);
        const confirmResponse = await client.patch(`/api/appointments/${confirmId}/confirm`);
        return confirmResponse.data;

      case 'reschedule':
        const rescheduleId = this.getNodeParameter('appointmentId', itemIndex);
        const rescheduleData = {
          date: this.getNodeParameter('date', itemIndex),
        };
        const rescheduleResponse = await client.patch(
          `/api/appointments/${rescheduleId}/reschedule`,
          rescheduleData
        );
        return rescheduleResponse.data;

      default:
        throw new NodeOperationError(this.getNode(), `Unknown appointment operation: ${operation}`);
    }
  }

  private async executePatientOperation(client: any, operation: string, itemIndex: number): Promise<any> {
    // Implementation for patient operations
    throw new NodeOperationError(this.getNode(), 'Patient operations not yet implemented');
  }

  private async executeAvailabilityOperation(client: any, operation: string, itemIndex: number): Promise<any> {
    switch (operation) {
      case 'check':
        const checkParams = {
          specialtyId: this.getNodeParameter('specialtyId', itemIndex),
          date: this.getNodeParameter('date', itemIndex),
          duration: this.getNodeParameter('duration', itemIndex, 30),
        };
        const checkResponse = await client.post('/api/availability/check', checkParams);
        return checkResponse.data;

      case 'list':
        const listParams = new URLSearchParams();
        listParams.append('specialtyId', this.getNodeParameter('specialtyId', itemIndex));
        listParams.append('date', this.getNodeParameter('date', itemIndex));
        
        const listResponse = await client.get(`/api/availability?${listParams.toString()}`);
        return listResponse.data;

      default:
        throw new NodeOperationError(this.getNode(), `Unknown availability operation: ${operation}`);
    }
  }

  private async executeQueueOperation(client: any, operation: string, itemIndex: number): Promise<any> {
    switch (operation) {
      case 'add':
        const addData = {
          patientId: this.getNodeParameter('patientId', itemIndex),
          specialtyId: this.getNodeParameter('specialtyId', itemIndex),
          priority: this.getNodeParameter('priority', itemIndex, 'MEDIUM'),
        };
        const addResponse = await client.post('/api/queue', addData);
        return addResponse.data;

      case 'list':
        const specialtyId = this.getNodeParameter('specialtyId', itemIndex);
        const listResponse = await client.get(`/api/queue/${specialtyId}`);
        return listResponse.data;

      default:
        throw new NodeOperationError(this.getNode(), `Unknown queue operation: ${operation}`);
    }
  }

  private async executeAiChatOperation(client: any, operation: string, itemIndex: number): Promise<any> {
    switch (operation) {
      case 'sendMessage':
        const message = this.getNodeParameter('message', itemIndex);
        const chatResponse = await client.post('/api/ai-chat', { message });
        return chatResponse.data;

      default:
        throw new NodeOperationError(this.getNode(), `Unknown AI chat operation: ${operation}`);
    }
  }
}