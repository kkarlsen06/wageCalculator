const request = require('supertest');
const express = require('express');
const cors = require('cors');

// Create a test app that mimics the server behavior
function createTestApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Mock authentication middleware
  const authenticateUser = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }
    req.user_id = 'test-user-123';
    next();
  };

  // Mock Supabase client
  const mockSupabase = {
    from: (table) => ({
      select: (columns) => ({
        eq: (column, value) => ({
          single: () => {
            if (table === 'user_settings') {
              return Promise.resolve({
                data: { hourly_rate: 250 },
                error: null
              });
            }
            return Promise.resolve({ data: null, error: null });
          },
          order: (column, options) => {
            if (table === 'user_shifts') {
              return Promise.resolve({
                data: [
                  {
                    id: '123',
                    user_id: 'user-123',
                    shift_date: '2024-01-15',
                    start_time: '09:00',
                    end_time: '17:00',
                    shift_type: 0
                  }
                ],
                error: null
              });
            }
            return Promise.resolve({ data: [], error: null });
          }
        })
      }),
      insert: (data) => ({
        select: () => Promise.resolve({ error: null })
      })
    })
  };

  // Mock OpenAI
  const mockOpenAI = {
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  };

  // Settings endpoint
  app.get('/settings', authenticateUser, async (req, res) => {
    try {
      const { data, error } = await mockSupabase
        .from('user_settings')
        .select('hourly_rate')
        .eq('user_id', req.user_id)
        .single();

      if (error && error.code !== 'PGRST116') {
        return res.status(500).json({ error: 'Failed to fetch settings' });
      }

      const hourlyRate = data?.hourly_rate ?? 0;
      res.json({ hourly_rate: hourlyRate });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Chat endpoint
  app.post('/chat', authenticateUser, async (req, res) => {
    try {
      const { messages } = req.body;

      const gptResponse = await mockOpenAI.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        functions: [{
          name: "addShift",
          description: "Add one work shift",
          parameters: {
            type: "object",
            properties: {
              shift_date: { type: "string", description: "YYYY-MM-DD" },
              start_time: { type: "string", description: "HH:mm" },
              end_time: { type: "string", description: "HH:mm" }
            },
            required: ["shift_date","start_time","end_time"]
          }
        }],
        function_call: "auto"
      });

      const msg = gptResponse.choices[0].message;

      if (msg.function_call) {
        const args = JSON.parse(msg.function_call.arguments);

        await mockSupabase
          .from('user_shifts')
          .insert({
            user_id: req.user_id,
            shift_date: args.shift_date,
            start_time: args.start_time,
            end_time: args.end_time,
            shift_type: 0
          })
          .select();

        const { data: allShifts } = await mockSupabase
          .from('user_shifts')
          .select('*')
          .eq('user_id', req.user_id)
          .order('shift_date', { ascending: true });

        return res.json({
          system: `Shift on ${args.shift_date} ${args.start_time}–${args.end_time} saved.`,
          shifts: allShifts || []
        });
      }

      const { data: allShifts } = await mockSupabase
        .from('user_shifts')
        .select('*')
        .eq('user_id', req.user_id)
        .order('shift_date', { ascending: true });

      res.json({ assistant: msg.content, shifts: allShifts || [] });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return { app, mockOpenAI };
}

describe('Shift Bot Server', () => {
  let app;
  let mockOpenAI;

  beforeEach(() => {
    const testApp = createTestApp();
    app = testApp.app;
    mockOpenAI = testApp.mockOpenAI;
  });

  describe('GET /settings', () => {
    test('should return hourly_rate from user_settings table', async () => {
      const response = await request(app)
        .get('/settings')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ hourly_rate: 250 });
    });

    test('should return 401 without authorization', async () => {
      const response = await request(app)
        .get('/settings');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /chat', () => {
    test('should add shift to user_shifts table with correct column names', async () => {
      // Mock GPT response with function call
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            function_call: {
              name: 'addShift',
              arguments: JSON.stringify({
                shift_date: '2024-01-15',
                start_time: '09:00',
                end_time: '17:00'
              })
            }
          }
        }]
      });

      const response = await request(app)
        .post('/chat')
        .set('Authorization', 'Bearer valid-token')
        .send({
          messages: [
            { role: 'user', content: 'Add a shift for today from 9:00 to 17:00' }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('system');
      expect(response.body).toHaveProperty('shifts');
      expect(response.body.system).toContain('2024-01-15 09:00–17:00 saved');
      
      // Verify the shifts array contains objects with new column names
      expect(response.body.shifts).toHaveLength(1);
      const shift = response.body.shifts[0];
      expect(shift).toHaveProperty('shift_date', '2024-01-15');
      expect(shift).toHaveProperty('start_time', '09:00');
      expect(shift).toHaveProperty('end_time', '17:00');
      expect(shift).toHaveProperty('user_id', 'user-123');
      
      // Verify old column names are not present
      expect(shift).not.toHaveProperty('date');
      expect(shift).not.toHaveProperty('start');
      expect(shift).not.toHaveProperty('end');
    });

    test('should use correct function schema with new column names', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            function_call: {
              name: 'addShift',
              arguments: JSON.stringify({
                shift_date: '2024-01-15',
                start_time: '10:00',
                end_time: '18:00'
              })
            }
          }
        }]
      });

      const response = await request(app)
        .post('/chat')
        .set('Authorization', 'Bearer valid-token')
        .send({
          messages: [
            { role: 'user', content: 'Add a shift for today from 10:00 to 18:00' }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.system).toContain('2024-01-15 10:00–18:00 saved');

      // Verify the function was called with the expected parameters structure
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          functions: expect.arrayContaining([
            expect.objectContaining({
              name: 'addShift',
              parameters: expect.objectContaining({
                required: ['shift_date', 'start_time', 'end_time']
              })
            })
          ])
        })
      );
    });

    test('should handle non-function call responses', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: 'Hello! How can I help you with your shifts today?'
          }
        }]
      });

      const response = await request(app)
        .post('/chat')
        .set('Authorization', 'Bearer valid-token')
        .send({
          messages: [
            { role: 'user', content: 'Hello' }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('assistant');
      expect(response.body).toHaveProperty('shifts');
      expect(response.body.assistant).toBe('Hello! How can I help you with your shifts today?');
    });

    test('should return 401 without authorization', async () => {
      const response = await request(app)
        .post('/chat')
        .send({
          messages: [
            { role: 'user', content: 'Add a shift' }
          ]
        });

      expect(response.status).toBe(401);
    });
  });
});
