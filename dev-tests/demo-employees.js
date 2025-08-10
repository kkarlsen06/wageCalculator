// Demo script showing employee management functionality
import 'dotenv/config';

const API_BASE = process.env.NODE_ENV === 'production' 
    ? 'https://wagecalculator-gbpd.onrender.com'
    : 'http://localhost:5173';

const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || 'demo-token';

console.log('🎭 Employee Management Demo\n');
console.log('API Base:', API_BASE);
console.log('=' .repeat(50));

async function makeRequest(method, path, body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AUTH_TOKEN}`
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${path}`, options);
    const data = await response.json();
    
    return { response, data };
}

async function demo() {
    try {
        console.log('\n📋 Step 1: Create some employees');
        console.log('-' .repeat(30));
        
        const employees = [
            {
                name: 'Alice Johnson',
                email: 'alice@company.com',
                hourly_wage: 275.00,
                birth_date: '1985-03-15',
                display_color: '#e74c3c'
            },
            {
                name: 'Bob Smith',
                email: 'bob@company.com',
                hourly_wage: 250.50,
                birth_date: '1990-07-22',
                display_color: '#3498db'
            },
            {
                name: 'Carol Davis',
                email: 'carol@company.com',
                hourly_wage: 300.25,
                display_color: '#2ecc71'
            }
        ];

        const createdEmployees = [];
        
        for (const emp of employees) {
            const { response, data } = await makeRequest('POST', '/employees', emp);
            if (response.status === 201) {
                createdEmployees.push(data.employee);
                console.log(`✅ Created: ${data.employee.name} (ID: ${data.employee.id})`);
            } else {
                console.log(`❌ Failed to create ${emp.name}:`, data.error);
            }
        }

        console.log('\n📋 Step 2: List all employees');
        console.log('-' .repeat(30));
        
        const { response: listResponse, data: listData } = await makeRequest('GET', '/employees');
        if (listResponse.status === 200) {
            console.log(`Found ${listData.employees.length} employees:`);
            listData.employees.forEach(emp => {
                console.log(`  • ${emp.name} - ${emp.email || 'No email'} - ${emp.hourly_wage ? emp.hourly_wage + ' kr/h' : 'No wage set'}`);
            });
        }

        if (createdEmployees.length > 0) {
            const firstEmployee = createdEmployees[0];
            
            console.log('\n📋 Step 3: Update an employee');
            console.log('-' .repeat(30));
            
            const updateData = {
                hourly_wage: 285.00,
                display_color: '#9b59b6'
            };
            
            const { response: updateResponse, data: updateData_result } = await makeRequest('PUT', `/employees/${firstEmployee.id}`, updateData);
            if (updateResponse.status === 200) {
                console.log(`✅ Updated ${updateData_result.employee.name}:`);
                console.log(`  • New wage: ${updateData_result.employee.hourly_wage} kr/h`);
                console.log(`  • New color: ${updateData_result.employee.display_color}`);
            }

            // Avatars disabled

            console.log('\n📋 Step 5: Archive an employee');
            console.log('-' .repeat(30));
            
            const { response: deleteResponse, data: deleteData } = await makeRequest('DELETE', `/employees/${firstEmployee.id}`);
            if (deleteResponse.status === 200) {
                console.log(`✅ Archived ${deleteData.employee.name}`);
                console.log(`  • Archived at: ${deleteData.employee.archived_at}`);
            }

            console.log('\n📋 Step 6: Verify archived employee is hidden');
            console.log('-' .repeat(30));
            
            const { response: listResponse2, data: listData2 } = await makeRequest('GET', '/employees');
            if (listResponse2.status === 200) {
                const archivedEmployee = listData2.employees.find(emp => emp.id === firstEmployee.id);
                if (!archivedEmployee) {
                    console.log('✅ Archived employee is hidden from default list');
                } else {
                    console.log('❌ Archived employee still appears in list');
                }
            }

            console.log('\n📋 Step 7: Show archived employee with flag');
            console.log('-' .repeat(30));
            
            const { response: listResponse3, data: listData3 } = await makeRequest('GET', '/employees?include_archived=1');
            if (listResponse3.status === 200) {
                const archivedEmployee = listData3.employees.find(emp => emp.id === firstEmployee.id);
                if (archivedEmployee && archivedEmployee.archived_at) {
                    console.log('✅ Archived employee appears with include_archived=1');
                    console.log(`  • ${archivedEmployee.name} (archived: ${archivedEmployee.archived_at})`);
                } else {
                    console.log('❌ Archived employee not found with flag');
                }
            }
        }

        console.log('\n📋 Step 8: Test validation');
        console.log('-' .repeat(30));
        
        const invalidEmployee = {
            name: '',
            email: 'invalid-email',
            hourly_wage: -10
        };
        
        const { response: invalidResponse, data: invalidData } = await makeRequest('POST', '/employees', invalidEmployee);
        if (invalidResponse.status === 400) {
            console.log('✅ Validation working correctly');
            console.log(`  • Error: ${invalidData.error}`);
        } else {
            console.log('❌ Validation not working');
        }

        console.log('\n🎉 Demo completed successfully!');
        console.log('=' .repeat(50));
        console.log('\nEmployee management system features demonstrated:');
        console.log('✅ Employee creation with validation');
        console.log('✅ Employee listing and filtering');
        console.log('✅ Employee updates');
        // Avatars disabled
        console.log('✅ Employee archiving (soft delete)');
        console.log('✅ Archive filtering');
        console.log('✅ Input validation');

    } catch (error) {
        console.error('❌ Demo failed:', error.message);
    }
}

// Run demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    demo().catch(console.error);
}

export { demo };
