import React from 'react';

const BatteryProgress = ({ percentage }) => {
    // 퍼센트에 따라 배터리 색상을 다르게 적용하는 로직 (선택 사항)
    let batteryColor = '#4caf50'; // 기본: 초록색
    if (percentage <= 20) batteryColor = '#f44336'; // 20% 이하: 빨간색
    else if (percentage <= 50) batteryColor = '#ff9800'; // 50% 이하: 주황색

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <div
                style={{
                    width: '80px',
                    height: '25px',
                    border: '2px solid #e0e0e0', // 화면 톤에 맞춘 테두리 색
                    borderRadius: '5px',
                    padding: '2px',
                    backgroundColor: '#fff',
                    boxSizing: 'border-box'
                }}
            >
                <div
                    style={{
                        width: `${percentage}%`,
                        height: '100%',
                        backgroundColor: batteryColor,
                        borderRadius: '1px',
                        transition: 'width 0.4s ease-in-out'
                    }}
                />
            </div>
            {/* 배터리 꼭지 */}
            <div
                style={{
                    width: '5px',
                    height: '12px',
                    backgroundColor: '#e0e0e0',
                    borderRadius: '0 2px 2px 0'
                }}
            />
            {/* 텍스트 */}
            <span style={{ marginLeft: '8px', fontWeight: 'bold', color: '#000000ff' }}>
                {percentage}%
            </span>
        </div>
    );
};

export default BatteryProgress;