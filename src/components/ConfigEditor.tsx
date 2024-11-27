"use client"
import React, { useState, useEffect } from 'react';
import { AlertCircle, Plus, Download } from 'lucide-react';

interface ConfigField {
  Field_Code: string;
  field_type: string;
  data: string;
  label: string;
  visibility: string;
  Customization: string;
  [key: string]: string;
}

interface CSVParseResult {
  headerRow: string[];
  configRows: ConfigField[];
  firstRows: string[];
}

const LOCKED_FIELD_TYPES = ['TYP', 'KEY', 'STA', 'STT', 'STR', 'REF', 'TIM', 'ALT'];
const VALID_FIELD_TYPES = [
  { value: 'GEN', label: 'General Text Field' },
  { value: 'CAT', label: 'Codeset Values' },
  { value: 'IMG', label: 'Image Upload' },
  { value: 'NUM', label: 'Number Field' },
  { value: 'DAT', label: 'Date Field' },
  { value: 'TAG', label: 'Barcode/QR Code' },
  { value: 'DOC', label: 'Document Upload' },
  { value: 'LOC', label: 'Location Field' }
];

const DISPLAY_PARAMS = [
  'FILTER', 'SEARCH', 'SORT', 'MOBILE', 'DETAIL',
  'CREATE', 'EDIT', 'SELECT', 'LIST', 'MAP', 'CARD', 'REPORT'
];

const parseCSV = (content: string): CSVParseResult => {
  const lines = content.split('\n');
  const headerRow = lines[3].split(',');
  const configRows = lines.slice(4).filter(line => line.trim());
  return {
    headerRow,
    configRows: configRows.map(row => {
      const values = row.split(',');
      return headerRow.reduce((obj, header, index) => {
        obj[header.trim()] = values[index] || '';
        return obj;
      }, {} as ConfigField);
    }),
    firstRows: lines.slice(0, 3)
  };
};

const generateCSV = (config: ConfigField[], headerRow: string[], firstRows: string[]): string => {
  const headers = headerRow.join(',');
  const rows = config.map(field => {
    return headerRow.map(header => field[header.trim()] || '').join(',');
  });
  return [...firstRows, headers, '', ...rows].join('\n');
};

export default function ConfigEditor() {
  const [config, setConfig] = useState<ConfigField[]>([]);
  const [headerRow, setHeaderRow] = useState<string[]>([]);
  const [firstRows, setFirstRows] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [csvContent, setCsvContent] = useState('');

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/config/read');
      const data = await response.json();
      if (data.content) {
        const { headerRow, configRows, firstRows } = parseCSV(data.content);
        setHeaderRow(headerRow);
        setConfig(configRows);
        setFirstRows(firstRows);
      }
    } catch {
      setError('Failed to load configuration');
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (headerRow.length && config.length) {
      const newCsvContent = generateCSV(config, headerRow, firstRows);
      setCsvContent(newCsvContent);
    }
  }, [config, headerRow, firstRows]);

  const validateSequence = (paramName: string, value: string, fieldCode: string): boolean => {
    const sequence = parseInt(value);
    return !config.some(field => 
      field.Field_Code !== fieldCode && 
      parseInt(field[paramName]) === sequence
    );
  };

  const handleFieldChange = (fieldCode: string, param: string, value: string): void => {
    setError('');
    
    if (DISPLAY_PARAMS.includes(param)) {
      // Skip if value is empty
      if (value && !validateSequence(param, value, fieldCode)) {
        setError(`Sequence number ${value} is already used in ${param}`);
        return;
      }
  
      // Check if any other field already has this sequence number
      const sequenceExists = config.some(field => 
        field.Field_Code !== fieldCode && 
        field[param] === value
      );
  
      if (sequenceExists) {
        setError(`Sequence number ${value} is already used in ${param}`);
        return;
      }
    }
  
    setConfig(prev => prev.map(field => {
      if (field.Field_Code === fieldCode) {
        return { ...field, [param]: value };
      }
      return field;
    }));
  };

  const addNewField = (): void => {
    if (config.length === 0) {
      setError('No existing fields to reference');
      return;
    }

    const lastField = config[config.length - 1];
    const lastNum = parseInt(lastField.Field_Code.replace('fieldCode', ''));
    const newFieldCode = `fieldCode${String(lastNum + 1).padStart(3, '0')}`;
    
    setConfig(prev => [...prev, {
      Field_Code: newFieldCode,
      field_type: '',
      data: '',
      label: '',
      visibility: 'SUPERVISOR',
      Customization: 'NEW',
      ...DISPLAY_PARAMS.reduce((acc, param) => ({ ...acc, [param]: '' }), {})
    } as ConfigField]);
  };

  const handleDownload = (): void => {
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'config.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSave = async (): Promise<void> => {
    try {
      const response = await fetch('/api/config/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: csvContent }),
      });

      if (!response.ok) {
        throw new Error();
      }

      setError('');
    } catch {
      setError('Failed to save configuration');
    }
  };

  return (
    <div className="w-full p-4 bg-white rounded-lg shadow">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-bold">Configuration Editor</h2>
        <div className="flex gap-2">
          <button
            onClick={addNewField}
            className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            aria-label="Add new field"
          >
            <Plus size={16} /> Add Field
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            aria-label="Save configuration"
          >
            Save
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            aria-label="Download CSV"
          >
            <Download size={16} /> Download
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2">Field Code</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Label</th>
              {DISPLAY_PARAMS.map(param => (
                <th key={param} className="px-4 py-2">{param}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {config.map((field) => (
              <tr key={field.Field_Code} className="hover:bg-gray-50">
                <td className="px-4 py-2">{field.Field_Code}</td>
                <td className="px-4 py-2">
                  {LOCKED_FIELD_TYPES.includes(field.field_type) ? (
                    <span className="text-gray-500">{field.field_type}</span>
                  ) : (
                    <select
                      value={field.field_type}
                      onChange={(e) => handleFieldChange(field.Field_Code, 'field_type', e.target.value)}
                      className="border rounded p-1"
                      aria-label={`Field type for ${field.Field_Code}`}
                    >
                      <option value="">Select Type</option>
                      {VALID_FIELD_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => handleFieldChange(field.Field_Code, 'label', e.target.value)}
                    className="border rounded p-1 w-full"
                    aria-label={`Label for ${field.Field_Code}`}
                  />
                </td>
                {DISPLAY_PARAMS.map(param => (
                  <td key={param} className="px-4 py-2">
                    <input
                      type="number"
                      value={field[param]}
                      onChange={(e) => handleFieldChange(field.Field_Code, param, e.target.value)}
                      className="border rounded p-1 w-16"
                      min="1"
                      aria-label={`${param} sequence for ${field.Field_Code}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-4 bg-gray-50 rounded">
        <h3 className="text-lg font-bold mb-2">Current CSV Content</h3>
        <pre className="whitespace-pre-wrap font-mono text-sm">
          {csvContent}
        </pre>
      </div>
    </div>
  );
}