import React, { useState, useEffect } from 'react';
import { Form, Dropdown } from 'react-bootstrap';

const ColumnFilter = ({ column, value, onChange, onClear, data }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [uniqueValues, setUniqueValues] = useState([]);
    const [selectedValues, setSelectedValues] = useState(new Set());

    useEffect(() => {
        // Получаем уникальные значения для столбца
        const values = new Set(data.map(row => row[column]?.toString() || '').filter(Boolean));
        setUniqueValues([...values].sort());
    }, [data, column]);

    useEffect(() => {
        // Синхронизируем внешнее значение фильтра с внутренним состоянием
        if (value) {
            setSelectedValues(new Set(value.split('|')));
        } else {
            setSelectedValues(new Set());
        }
    }, [value]);

    const handleCheckboxChange = (val) => {
        const newSelected = new Set(selectedValues);
        if (newSelected.has(val)) {
            newSelected.delete(val);
        } else {
            newSelected.add(val);
        }
        setSelectedValues(newSelected);
        
        if (newSelected.size > 0) {
            onChange([...newSelected].join('|'));
        } else {
            onClear();
        }
    };

    const handleSelectAll = () => {
        if (selectedValues.size === uniqueValues.length) {
            onClear();
            setSelectedValues(new Set());
        } else {
            const newSelected = new Set(uniqueValues);
            setSelectedValues(newSelected);
            onChange([...newSelected].join('|'));
        }
    };

    return (
        <Dropdown 
            show={isOpen} 
            onToggle={(isOpen) => setIsOpen(isOpen)}
            className="column-filter"
        >
            <Dropdown.Toggle 
                variant="outline-secondary" 
                size="sm" 
                className="w-100 filter-toggle"
            >
                {selectedValues.size > 0 ? `Выбрано: ${selectedValues.size}` : 'Фильтр'}
            </Dropdown.Toggle>

            <Dropdown.Menu className="filter-menu">
                <div className="px-2 py-1">
                    <Form.Check
                        type="checkbox"
                        label="Выбрать все"
                        checked={selectedValues.size === uniqueValues.length}
                        onChange={handleSelectAll}
                        className="select-all"
                    />
                    <hr className="my-1" />
                    <div className="filter-values-container">
                        {uniqueValues.map((val) => (
                            <Form.Check
                                key={val}
                                type="checkbox"
                                label={val}
                                checked={selectedValues.has(val)}
                                onChange={() => handleCheckboxChange(val)}
                                className="filter-value-item"
                            />
                        ))}
                    </div>
                </div>
            </Dropdown.Menu>
        </Dropdown>
    );
};

export default ColumnFilter; 