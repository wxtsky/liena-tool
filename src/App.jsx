import React, {useState} from 'react';
import axios from 'axios';
import {Input, Button, Table, message, Tag, Space, Typography, Row, Col, Card} from 'antd';
import {ethers} from "ethers";

const {Title, Text} = Typography;

async function getLxpL(address) {
    try {
        const response = await axios.get('https://kx58j6x5me.execute-api.us-east-1.amazonaws.com/linea/getUserPointsSearch', {
            params: {
                'user': address.toLowerCase()
            },
        });
        if (response.data.length !== 0) {
            const {rank_xp, xp} = response.data[0];
            return {rank_xp, xp, status: 'success'};
        } else {
            return {rank_xp: 0, xp: 0, status: 'success'};
        }
    } catch (error) {
        console.error('Error in getLxpL:', error);
        return {rank_xp: 0, xp: 0, status: 'error', message: 'Failed to get LXP-L data'};
    }
}

async function isPoh(address) {
    try {
        const response = await axios.get('https://linea-xp-poh-api.linea.build/poh/' + address);
        return {poh: response.data.poh, status: 'success'};
    } catch (error) {
        console.error('Error in isPoh:', error);
        return {poh: false, status: 'error', message: 'Failed to get POH data'};
    }
}

async function getLxp(contract, address) {
    try {
        const balance = await contract.balanceOf(address);
        return {lxp: ethers.utils.formatUnits(balance, 18), status: 'success'};
    } catch (error) {
        console.error('Error in getLxp:', error);
        return {lxp: '0', status: 'error', message: 'Failed to get LXP data'};
    }
}

function App() {
    const [loading, setLoading] = useState(false);
    const [addresses, setAddresses] = useState('');
    const [tableData, setTableData] = useState([]);
    const rpc = 'https://rpc.linea.build';
    const tokenAddress = '0xd83af4fbD77f3AB65C3B1Dc4B38D7e67AEcf599A';
    const provider = new ethers.providers.JsonRpcProvider(rpc);

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

    return (
        <Row justify="center" style={{marginTop: 24}}>
            <Col xs={24} sm={24} md={24} lg={24} xl={24}>
                <Card>
                    <Title level={3}>Linea数据查询</Title>
                    <Input.TextArea
                        value={addresses}
                        onChange={e => setAddresses(e.target.value)}
                        placeholder="输入Linea地址,每行一个"
                        autoSize={{minRows: 5, maxRows: 10}}
                        style={{marginBottom: 16}}
                    />
                    <Row justify="space-between" align="middle">
                        <Col>
                            <Button type="primary" onClick={handleClick} loading={loading} size={"large"}>
                                查询
                            </Button>
                            <Text strong={true} style={{marginLeft: 5}}>
                                By <a href="https://x.com/beibeieth" target="_blank" rel="noreferrer">北北</a>
                            </Text>
                            <Text strong={true} style={{marginLeft: 5}}>
                                数据从本地查询,不会上传到服务器
                            </Text>
                        </Col>
                        {tableData.length > 0 && (
                            <Col>
                                <Space size="middle">
                                    <Text strong>总地址: {tableData.length.toLocaleString()}</Text>
                                    <Text
                                        strong>LXP: {tableData.reduce((sum, item) => sum + parseFloat(item.lxp), 0).toFixed(2).toLocaleString()}</Text>
                                    <Text
                                        strong>LXP-L: {tableData.reduce((sum, item) => sum + item.xp, 0).toLocaleString()}</Text>
                                    <Text
                                        strong>POH正常: {tableData.filter(item => item.poh).length.toLocaleString()}</Text>
                                    <Text
                                        strong>POH异常: {tableData.filter(item => !item.poh).length.toLocaleString()}</Text>
                                </Space>
                            </Col>
                        )}
                    </Row>
                    <Table
                        columns={columns}
                        dataSource={tableData}
                        loading={loading}
                        style={{marginTop: 24}}
                        pagination={false}
                        bordered
                    />
                </Card>
            </Col>
        </Row>
    );
}

export default App;