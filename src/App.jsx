import React, { useState } from 'react';
import axios from 'axios';
import { Input, Button, Table, message, Tag, Space, Typography, Row, Col, Card } from 'antd';
import { ethers } from "ethers";

// 添加X图标组件
const XIcon = () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

const { Title, Text } = Typography;

async function getLxpL(address) {
    try {
        const response = await axios.get('https://kx58j6x5me.execute-api.us-east-1.amazonaws.com/linea/getUserPointsSearch', {
            params: {
                'user': address.toLowerCase()
            },
        });
        if (response.data.length !== 0) {
            const { rank_xp, xp } = response.data[0];
            return { rank_xp, xp, status: 'success' };
        } else {
            return { rank_xp: 0, xp: 0, status: 'success' };
        }
    } catch (error) {
        console.error('Error in getLxpL:', error);
        return { rank_xp: 0, xp: 0, status: 'error', message: 'Failed to get LXP-L data' };
    }
}

async function isPoh(address) {
    try {
        const response = await axios.get('https://linea-xp-poh-api.linea.build/poh/' + address);
        return { poh: response.data.poh, status: 'success' };
    } catch (error) {
        console.error('Error in isPoh:', error);
        return { poh: false, status: 'error', message: 'Failed to get POH data' };
    }
}

async function getLxp(contract, address) {
    try {
        const balance = await contract.balanceOf(address);
        return { lxp: ethers.utils.formatUnits(balance, 18), status: 'success' };
    } catch (error) {
        console.error('Error in getLxp:', error);
        return { lxp: '0', status: 'error', message: 'Failed to get LXP data' };
    }
}

function App() {
    const [loading, setLoading] = useState(false);
    const [addresses, setAddresses] = useState('');
    const [tableData, setTableData] = useState([]);
    const rpc = 'https://rpc.linea.build';
    const tokenAddress = '0xd83af4fbD77f3AB65C3B1Dc4B38D7e67AEcf599A';
    const provider = new ethers.providers.JsonRpcProvider(rpc);
    const [pohFilter, setPohFilter] = useState('all'); // 'all', 'verified', 'unverified'

    const handleClick = async () => {
        setLoading(true);
        const tokenContract = new ethers.Contract(tokenAddress, [
            "function balanceOf(address owner) view returns (uint256)"
        ], provider);
        try {
            const uniqueAddresses = [...new Set(addresses.split('\n').map(item => item.trim()).filter(item => item))];
            const lxplData = await Promise.all(uniqueAddresses.map(address => getLxpL(address)));
            const pohData = await Promise.all(uniqueAddresses.map(address => isPoh(address)));
            const lxpData = await Promise.all(uniqueAddresses.map(address => getLxp(tokenContract, address)));
            const tableData = lxplData.map((item, index) => ({
                key: index,
                address: uniqueAddresses[index],
                rank_xp: item.rank_xp,
                xp: item.xp,
                poh: pohData[index].poh,
                lxp: lxpData[index].lxp,
                status: item.status === 'success' && pohData[index].status === 'success' && lxpData[index].status === 'success' ? '正常' : [item.message, pohData[index].message, lxpData[index].message].filter(msg => msg).join(', ')
            }));
            setTableData(tableData);
        } catch (error) {
            console.error('Error:', error);
            message.error('获取数据失败,请检查地址是否正确');
        }
        setLoading(false);
    };

    const getFilteredData = () => {
        switch(pohFilter) {
            case 'verified':
                return tableData.filter(item => item.poh);
            case 'unverified':
                return tableData.filter(item => !item.poh);
            default:
                return tableData;
        }
    };

    const getStats = (data) => ({
        total: data.length,
        totalLxp: data.reduce((sum, item) => sum + parseFloat(item.lxp), 0).toFixed(2),
        totalLxpL: data.reduce((sum, item) => sum + item.xp, 0),
        pohVerified: data.filter(item => item.poh).length,
        pohUnverified: data.filter(item => !item.poh).length,
        verifiedLxp: data.filter(item => item.poh)
            .reduce((sum, item) => sum + parseFloat(item.lxp), 0).toFixed(2),
        verifiedLxpL: data.filter(item => item.poh)
            .reduce((sum, item) => sum + item.xp, 0),
        unverifiedLxp: data.filter(item => !item.poh)
            .reduce((sum, item) => sum + parseFloat(item.lxp), 0).toFixed(2),
        unverifiedLxpL: data.filter(item => !item.poh)
            .reduce((sum, item) => sum + item.xp, 0)
    });

    const columns = [
        {
            title: '#',
            dataIndex: 'key',
            key: 'key',
            render: (text, record, index) => index + 1
        },
        {
            title: '地址',
            dataIndex: 'address',
            key: 'address',
        },
        {
            title: 'LXP',
            dataIndex: 'lxp',
            key: 'lxp',
            sorter: (a, b) => a.lxp - b.lxp,
            render: lxp => lxp !== '0' ? lxp : '0'
        },
        {
            title: 'LXP-L',
            dataIndex: 'xp',
            key: 'xp',
            sorter: (a, b) => a.xp - b.xp,
        },
        {
            title: 'LXP-L排名',
            dataIndex: 'rank_xp',
            key: 'rank_xp',
            sorter: (a, b) => a.rank_xp - b.rank_xp,
            render: rank_xp => rank_xp !== 0 ? rank_xp : '-'
        },
        {
            title: 'POH',
            dataIndex: 'poh',
            key: 'poh',
            render: poh => poh ? <Tag color="success">是</Tag> : <Tag color="error">否</Tag>,
            sorter: (a, b) => a.poh - b.poh,
        },
        {
            title: '获取数据结果状态',
            dataIndex: 'status',
            key: 'status',
            render: status => status === '正常' ? <Tag color="success">正常</Tag> : <Tag color="error">{status}</Tag>
        }
    ];

    // 在return之前添加样式常量
    const styles = {
        actionButton: {
            marginLeft: 8,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
        },
        statsCard: {
            minWidth: 200,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            borderRadius: '8px'
        },
        filterButton: {
            minWidth: 120
        }
    };

    return (
        <Row justify="center" style={{ marginTop: 24 }}>
            <Col xs={24} sm={24} md={24} lg={24} xl={24}>
                <Card>
                    <Title level={3}>Linea数据查询</Title>
                    <Input.TextArea
                        value={addresses}
                        onChange={e => setAddresses(e.target.value)}
                        placeholder="输入Linea地址,每行一个"
                        autoSize={{ minRows: 5, maxRows: 10 }}
                        style={{ marginBottom: 16 }}
                    />
                    
                    {/* 操作按钮区域 */}
                    <Row gutter={[16, 16]}>
                        <Col>
                            <Space size="middle">
                                <Button type="primary" onClick={handleClick} loading={loading} size="large">
                                    查询
                                </Button>
                                <Text strong={true}>By 北北</Text>
                                <Button
                                    type="primary"
                                    icon={<XIcon />}
                                    href="https://x.com/beibeinbnb"
                                    target="_blank"
                                    style={{ ...styles.actionButton, background: '#000000', borderColor: '#000000' }}
                                >
                                    关注我
                                </Button>
                            </Space>
                        </Col>
                        <Col flex="auto">
                            <Button
                                type="primary"
                                href="https://redeemsol.com"
                                target="_blank"
                                style={{ ...styles.actionButton, background: '#14F195', borderColor: '#14F195', color: '#000000' }}
                            >
                                北北推荐实用工具：SOL空余额账户回收 💰
                            </Button>
                        </Col>
                    </Row>

                    <Text type="secondary" style={{ display: 'block', margin: '16px 0' }}>
                        数据从本地查询,不会上传到服务器
                    </Text>

                    {tableData.length > 0 && (
                        <div style={{ marginBottom: 24 }}>
                            {/* POH筛选按钮 */}
                            <Row style={{ marginBottom: 16 }}>
                                <Space size="middle">
                                    <Button 
                                        type={pohFilter === 'all' ? 'primary' : 'default'}
                                        onClick={() => setPohFilter('all')}
                                        style={styles.filterButton}
                                    >
                                        显示全部
                                    </Button>
                                    <Button 
                                        type={pohFilter === 'verified' ? 'primary' : 'default'}
                                        onClick={() => setPohFilter('verified')}
                                        style={styles.filterButton}
                                    >
                                        仅显示POH正常
                                    </Button>
                                    <Button 
                                        type={pohFilter === 'unverified' ? 'primary' : 'default'}
                                        onClick={() => setPohFilter('unverified')}
                                        style={styles.filterButton}
                                    >
                                        仅显示POH异常
                                    </Button>
                                </Space>
                            </Row>

                            {/* 统计卡片 */}
                            <Row gutter={[16, 16]}>
                                <Col xs={24} sm={24} md={8}>
                                    <Card size="small" style={styles.statsCard}>
                                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                            <Text strong style={{ fontSize: 16 }}>总计数据</Text>
                                            <Row justify="space-between">
                                                <Col>总地址数:</Col>
                                                <Col><Text strong>{getStats(tableData).total.toLocaleString()}</Text></Col>
                                            </Row>
                                            <Row justify="space-between">
                                                <Col>总LXP:</Col>
                                                <Col><Text strong>{getStats(tableData).totalLxp.toLocaleString()}</Text></Col>
                                            </Row>
                                            <Row justify="space-between">
                                                <Col>总LXP-L:</Col>
                                                <Col><Text strong>{getStats(tableData).totalLxpL.toLocaleString()}</Text></Col>
                                            </Row>
                                        </Space>
                                    </Card>
                                </Col>
                                <Col xs={24} sm={24} md={8}>
                                    <Card size="small" style={styles.statsCard}>
                                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                            <Text strong style={{ fontSize: 16, color: '#52c41a' }}>POH正常账号</Text>
                                            <Row justify="space-between">
                                                <Col>数量:</Col>
                                                <Col><Text strong>{getStats(tableData).pohVerified.toLocaleString()}</Text></Col>
                                            </Row>
                                            <Row justify="space-between">
                                                <Col>LXP:</Col>
                                                <Col><Text strong>{getStats(tableData).verifiedLxp.toLocaleString()}</Text></Col>
                                            </Row>
                                            <Row justify="space-between">
                                                <Col>LXP-L:</Col>
                                                <Col><Text strong>{getStats(tableData).verifiedLxpL.toLocaleString()}</Text></Col>
                                            </Row>
                                        </Space>
                                    </Card>
                                </Col>
                                <Col xs={24} sm={24} md={8}>
                                    <Card size="small" style={styles.statsCard}>
                                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                            <Text strong style={{ fontSize: 16, color: '#ff4d4f' }}>POH异常账号</Text>
                                            <Row justify="space-between">
                                                <Col>数量:</Col>
                                                <Col><Text strong>{getStats(tableData).pohUnverified.toLocaleString()}</Text></Col>
                                            </Row>
                                            <Row justify="space-between">
                                                <Col>LXP:</Col>
                                                <Col><Text strong>{getStats(tableData).unverifiedLxp.toLocaleString()}</Text></Col>
                                            </Row>
                                            <Row justify="space-between">
                                                <Col>LXP-L:</Col>
                                                <Col><Text strong>{getStats(tableData).unverifiedLxpL.toLocaleString()}</Text></Col>
                                            </Row>
                                        </Space>
                                    </Card>
                                </Col>
                            </Row>
                        </div>
                    )}

                    <Table
                        columns={columns}
                        dataSource={getFilteredData()}
                        loading={loading}
                        pagination={false}
                        bordered
                    />
                </Card>
            </Col>
        </Row>
    );
}

export default App;
