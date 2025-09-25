// Worker loader that works with Next.js
export function createExcelParserWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    console.log('Worker not available: window or Worker undefined')
    return null
  }
  
  console.log('Creating Excel parser worker...')
  try {
    // Create worker with inline code for Next.js compatibility
    const workerCode = `
      importScripts('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
      
      // Generate unique ID
      function generateId() {
        return Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
      }

      // Parse date from various formats
      function parseDate(value) {
        if (!value) return null;
        
        if (value instanceof Date) return value;
        
        if (typeof value === 'number') {
          // Excel date number
          return new Date((value - 25569) * 86400 * 1000);
        }
        
        if (typeof value === 'string') {
          const date = new Date(value);
          return isNaN(date.getTime()) ? null : date;
        }
        
        return null;
      }

      // Normalize date to Monday of the week
      function normalizeDateToMonday(dateValue) {
        const parsed = parseDate(dateValue);
        if (!parsed) {
          const now = new Date();
          return {
            date: now.toISOString().split('T')[0],
            week: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
          };
        }
        
        // Get Monday of the week
        const day = parsed.getDay();
        const diff = parsed.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(parsed.setDate(diff));
        
        return {
          date: monday.toISOString().split('T')[0],
          week: monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
        };
      }

      // Parse skills from row data
      function parseSkills(row) {
        const skills = {};
        const excludeFields = ['Name', 'Employee', 'Email', 'ID', 'id', 'Max Hours', 'Team'];
        
        Object.keys(row).forEach(key => {
          if (!excludeFields.includes(key)) {
            const value = row[key];
            if (value && value !== 'None' && value !== '') {
              if (['Beginner', 'Intermediate', 'Expert'].includes(value)) {
                skills[key] = value;
              } else if (typeof value === 'number') {
                if (value >= 3) skills[key] = 'Expert';
                else if (value >= 2) skills[key] = 'Intermediate';
                else if (value >= 1) skills[key] = 'Beginner';
              } else if (value) {
                skills[key] = 'Intermediate';
              }
            }
          }
        });
        
        return skills;
      }

      // Main parsing function
      function parseWorkbook(workbook, onProgress) {
        const result = {
          employees: [],
          projects: [],
          assignments: [],
          skills: [],
          teams: ['All Teams'],
        };

        let progress = 0;
        onProgress(10);

        // Parse Employees sheet
        if (workbook.Sheets['Employees']) {
          const sheet = XLSX.utils.sheet_to_json(workbook.Sheets['Employees']);
          result.employees = sheet.map((row) => ({
            id: row.ID || row.id || generateId(),
            name: row.Name || row.Employee || '',
            email: row.Email || '',
            maxHours: Number(row['Max Hours']) || 40,
            team: row.Team || 'Default',
            skills: parseSkills(row),
          }));
          progress = 30;
          onProgress(progress);
        }

        // Parse Projects sheet
        if (workbook.Sheets['Projects']) {
          const sheet = XLSX.utils.sheet_to_json(workbook.Sheets['Projects']);
          result.projects = sheet.map((row) => ({
            id: row.ID || row.id || generateId(),
            name: row.Name || row.Project || '',
            startDate: parseDate(row['Start Date']) || new Date(),
            endDate: parseDate(row['End Date']) || new Date(),
            requiredSkills: row['Required Skills'] 
              ? String(row['Required Skills']).split(',').map(s => s.trim())
              : [],
            portfolio: row.Portfolio || '',
          }));
          progress = 50;
          onProgress(progress);
        }

        // Parse Assignments sheet
        if (workbook.Sheets['Assignments']) {
          const sheet = XLSX.utils.sheet_to_json(workbook.Sheets['Assignments']);
          const totalRows = sheet.length;
          
          // Check for pivot format
          const firstRow = sheet[0] || {};
          const columns = Object.keys(firstRow);
          const dateColumns = columns.filter(col => {
            return /^\\d{4}-\\d{2}-\\d{2}/.test(col) || 
                   /^\\d{1,2}\\/\\d{1,2}\\/\\d{4}/.test(col) ||
                   /^[A-Z][a-z]{2}\\s+\\d{1,2}/.test(col);
          });
          
          if (dateColumns.length > 0) {
            // Pivot format
            result.assignments = [];
            let processedRows = 0;
            
            sheet.forEach((row) => {
              const employeeIdOrName = row.Employee || row['Employee'] || row['Employee ID'] || '';
              const projectIdOrName = row.Project || row['Project'] || row['Project ID'] || '';
              
              if (!employeeIdOrName || !projectIdOrName) return;
              
              let employeeId = employeeIdOrName;
              const employeeById = result.employees.find(e => e.id === employeeIdOrName);
              const employeeByName = result.employees.find(e => e.name === employeeIdOrName);
              if (!employeeById && employeeByName) {
                employeeId = employeeByName.id;
              }
              
              let projectId = projectIdOrName;
              const projectById = result.projects.find(p => p.id === projectIdOrName);
              const projectByName = result.projects.find(p => p.name === projectIdOrName);
              if (!projectById && projectByName) {
                projectId = projectByName.id;
              }
              
              dateColumns.forEach(dateCol => {
                const hours = row[dateCol];
                if (hours && Number(hours) > 0) {
                  const normalized = normalizeDateToMonday(dateCol);
                  result.assignments.push({
                    id: generateId(),
                    employeeId: employeeId,
                    projectId: projectId,
                    hours: Number(hours),
                    week: normalized.week,
                    date: normalized.date
                  });
                }
              });
              
              processedRows++;
              if (processedRows % 10 === 0) {
                const assignmentProgress = 50 + (processedRows / totalRows) * 40;
                onProgress(Math.min(90, assignmentProgress));
              }
            });
          } else {
            // Traditional format
            result.assignments = sheet.map((row, index) => {
              const rawDate = row.Week || row['Week'] || row.Date || row['Date'] || row.week || row.date;
              const normalized = normalizeDateToMonday(rawDate);
              
              const rawHours = row.Hours || row['Hours'] || row.hours || 0;
              const parsedHours = typeof rawHours === 'string' ? parseFloat(rawHours) || 0 : Number(rawHours) || 0;
              
              const employeeIdOrName = row['Employee ID'] || row.Employee || row['Employee'] || row['employee'] || '';
              const projectIdOrName = row['Project ID'] || row.Project || row['Project'] || row['project'] || '';
              
              let employeeId = employeeIdOrName;
              const employeeById = result.employees.find(e => e.id === employeeIdOrName);
              const employeeByName = result.employees.find(e => e.name === employeeIdOrName);
              if (!employeeById && employeeByName) {
                employeeId = employeeByName.id;
              }
              
              let projectId = projectIdOrName;
              const projectById = result.projects.find(p => p.id === projectIdOrName);
              const projectByName = result.projects.find(p => p.name === projectIdOrName);
              if (!projectById && projectByName) {
                projectId = projectByName.id;
              }
              
              if (index % 50 === 0) {
                const assignmentProgress = 50 + (index / totalRows) * 40;
                onProgress(Math.min(90, assignmentProgress));
              }
              
              return {
                id: generateId(),
                employeeId: employeeId,
                projectId: projectId,
                hours: parsedHours,
                week: normalized.week,
                date: normalized.date
              };
            });
          }
          
          progress = 90;
          onProgress(progress);
        }

        // Parse Skills sheet (optional)
        if (workbook.Sheets['Skills']) {
          const sheet = XLSX.utils.sheet_to_json(workbook.Sheets['Skills']);
          const skillSet = new Set();
          
          sheet.forEach((row) => {
            Object.keys(row).forEach(key => {
              if (key !== 'Employee' && key !== 'ID' && key !== 'Name') {
                skillSet.add(key);
              }
            });
          });
          
          result.skills = Array.from(skillSet);
        } else {
          // Extract skills from employees
          const skillSet = new Set();
          result.employees.forEach(emp => {
            Object.keys(emp.skills).forEach(skill => skillSet.add(skill));
          });
          result.skills = Array.from(skillSet);
        }

        // Extract teams
        const teamSet = new Set(['All Teams']);
        result.employees.forEach(emp => {
          if (emp.team) teamSet.add(emp.team);
        });
        result.teams = Array.from(teamSet);

        onProgress(100);
        return result;
      }

      // Message handler
      self.addEventListener('message', async (event) => {
        const { type, data } = event.data;
        
        if (type === 'parse') {
          try {
            const { arrayBuffer } = data;
            
            // Post initial progress
            self.postMessage({ type: 'progress', progress: 5 });
            
            // Parse the workbook
            const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array', cellDates: true });
            
            if (!workbook.Sheets || Object.keys(workbook.Sheets).length === 0) {
              throw new Error('No sheets found in the Excel file');
            }
            
            // Parse with progress updates
            const result = parseWorkbook(workbook, (progress) => {
              self.postMessage({ type: 'progress', progress });
            });
            
            // Send success result
            self.postMessage({ 
              type: 'success', 
              data: result 
            });
          } catch (error) {
            // Send error
            self.postMessage({ 
              type: 'error', 
              error: error.message || 'Unknown error occurred' 
            });
          }
        }
      });
    `
    
    const blob = new Blob([workerCode], { type: 'application/javascript' })
    const workerUrl = URL.createObjectURL(blob)
    console.log('Worker URL created:', workerUrl)
    
    const worker = new Worker(workerUrl)
    console.log('Worker instance created successfully')
    return worker
  } catch (error) {
    console.error('Failed to create worker:', error)
    return null
  }
}