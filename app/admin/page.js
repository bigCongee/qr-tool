"use client";

import {
  Button,
  Card,
  Col,
  ColorPicker,
  DatePicker,
  Divider,
  Form,
  Input,
  message,
  Popconfirm,
  Row,
  Segmented,
  Space,
  Slider,
  Table,
  Tag,
  Upload,
  Typography,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  DownloadOutlined,
  ReloadOutlined,
  SaveOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import dayjs from "dayjs";

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

const basePath = process.env.basePath  || "";

const emptyForm = {
  id: "",
  name: "",
  type: "dynamic",
  content: "",
  expiresAt: null,
  colorDark: "#0f172a",
  colorLight: "#ffffff",
  size: 320,
  logoDataUrl: "",
  logoSizePercent: 20,
  logoRadius: 12,
};

const sizeOptions = [
  { label: "240px", value: 240 },
  { label: "320px", value: 320 },
  { label: "420px", value: 420 },
  { label: "560px", value: 560 },
];

const cardStyle = {
  background: "rgba(17, 24, 39, 0.92)",
  border: "1px solid #1f2937",
  boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
  backdropFilter: "blur(10px)",
};

const parseChannel = (v) => Math.max(0, Math.min(255, Number(v) || 0));
function normalizeColor(color, fallback) {
  if (!color) return fallback;
  const c = color.trim();
  if (c.startsWith("#")) return c;
  const m = c.match(/rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/i);
  if (m) {
    const [r, g, b] = [parseChannel(m[1]), parseChannel(m[2]), parseChannel(m[3])];
    const hex = "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
    return hex;
  }
  return fallback;
}

async function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function overlayLogo(baseDataUrl, logoDataUrl, size, { logoSizePercent, logoRadius }) {
  if (!logoDataUrl) return baseDataUrl;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const baseImg = await loadImage(baseDataUrl);
  const logoImg = await loadImage(logoDataUrl);
  ctx.drawImage(baseImg, 0, 0, size, size);
  const logoSize = Math.max(20, size * (logoSizePercent || 20) * 0.01);
  const pos = (size - logoSize) / 2;
  const radius = Math.max(0, Math.min(logoRadius || 0, logoSize / 2));
  if (ctx.roundRect) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(pos, pos, logoSize, logoSize, radius);
    ctx.clip();
    ctx.drawImage(logoImg, pos, pos, logoSize, logoSize);
    ctx.restore();
  } else {
    ctx.drawImage(logoImg, pos, pos, logoSize, logoSize);
  }
  return canvas.toDataURL("image/png");
}

async function buildQr(
  data,
  { colorDark, colorLight, size, logoDataUrl, logoSizePercent, logoRadius }
) {
  if (!data) return "";
  const base = await QRCode.toDataURL(data, {
    color: { dark: colorDark, light: colorLight },
    width: size,
    margin: 2,
  });
  return overlayLogo(base, logoDataUrl, size, { logoSizePercent, logoRadius });
}

export default function AdminPage() {
  const [form] = Form.useForm();
  const values = Form.useWatch([], form) || emptyForm;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState("");
  const [origin, setOrigin] = useState("");
  const [listVersion, setListVersion] = useState(0);

  const isExpired = (expiresAt) =>
    expiresAt ? dayjs(expiresAt).isBefore(dayjs()) : false;

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${basePath}/api/qrs`);
      const data = await res.json();
      setItems(data || []);
    } catch (err) {
      console.error(err);
      message.error("加载列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    form.setFieldsValue(emptyForm);
    load();
  }, [form]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function generate() {
      const shouldGate = values.type === "dynamic";
      const qrData =
        shouldGate && origin && values.id
          ? `${origin}${basePath}/api/qrs/${values.id}/resolve`
          : values.content;
      if (!qrData) {
        setPreview("");
        return;
      }
        try {
          const url = await buildQr(qrData, {
            colorDark: normalizeColor(values.colorDark, emptyForm.colorDark),
            colorLight: normalizeColor(values.colorLight, emptyForm.colorLight),
            size: values.size || emptyForm.size,
            logoDataUrl: values.logoDataUrl,
            logoSizePercent: values.logoSizePercent ?? emptyForm.logoSizePercent,
            logoRadius: values.logoRadius ?? emptyForm.logoRadius,
          });
        if (active) setPreview(url || "");
      } catch (err) {
        console.error(err);
        if (active) setPreview("");
      }
    }
    generate();
    return () => {
      active = false;
    };
  }, [
    values.id,
    values.content,
    values.colorDark,
    values.colorLight,
    values.size,
    values.logoDataUrl,
    values.logoSizePercent,
    values.logoRadius,
    values.expiresAt,
    values.type,
    origin,
    listVersion,
  ]);

  const handlePick = (item) => {
    form.setFieldsValue({
      ...item,
      expiresAt: item.expiresAt ? dayjs(item.expiresAt) : null,
      logoSizePercent: item.logoSizePercent ?? emptyForm.logoSizePercent,
      logoRadius: item.logoRadius ?? emptyForm.logoRadius,
    });
    message.info(`正在编辑：${item.name}`);
  };

  const handleUpdate = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload = {
        ...values,
        expiresAt: values.expiresAt ? values.expiresAt.toDate().toISOString() : null,
        logoSizePercent: values.logoSizePercent ?? emptyForm.logoSizePercent,
        logoRadius: values.logoRadius ?? emptyForm.logoRadius,
      };
      const url = values.id
        ? `${basePath}/api/qrs/${values.id}`
        : `${basePath}/api/qrs`;
      const method = values.id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      form.setFieldsValue({
        ...payload,
        id: saved.id,
        expiresAt: payload.expiresAt ? dayjs(payload.expiresAt) : null,
      });
      message.success(values.id ? "已保存修改" : "已新增二维码");
      await load();
      setListVersion((v) => v + 1);
    } catch (err) {
      if (err?.errorFields) return;
      console.error(err);
      message.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${basePath}/api/qrs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      if (values.id === id) {
        form.setFieldsValue(emptyForm);
        setPreview("");
      }
      message.success("已删除");
      await load();
    } catch (err) {
      console.error(err);
      message.error("删除失败");
    }
  };

  const uploadProps = {
    showUploadList: false,
    maxCount: 1,
    accept: "image/*",
    beforeUpload: (file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        form.setFieldValue("logoDataUrl", e.target?.result?.toString() || "");
        message.success("Logo 已添加");
      };
      reader.readAsDataURL(file);
      return false;
    },
  };

  const columns = [
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <Space>
          <Text strong>{text}</Text>
          <Tag color="cyan">活码</Tag>
          {isExpired(record.expiresAt) && <Tag color="red">已过期</Tag>}
        </Space>
      ),
    },
    {
      title: "内容",
      dataIndex: "content",
      key: "content",
      ellipsis: true,
    },
    {
      title: "到期时间",
      dataIndex: "expiresAt",
      key: "expiresAt",
      render: (value) => (value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "无"),
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value) => dayjs(value).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: "操作",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            type="link"
            onClick={() => handlePick(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="删除确认"
            description="确定删除此二维码记录？"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button danger type="link" icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="large" className="page-stack">
      <div>
        <Title level={2} style={{ margin: 0, color: "#e5e7eb" }}>
          管理员面板
        </Title>
        <Paragraph className="muted" style={{ marginTop: 6 }}>
          查看、编辑或删除已生成的二维码，支持修改过期时间、样式与内容。
        </Paragraph>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card
            className="frosted-card"
            title="二维码列表"
            bordered={false}
            extra={
              <Space>
                <Button icon={<ReloadOutlined />} onClick={load}>
                  刷新
                </Button>
              </Space>
            }
            style={{ ...cardStyle, height: "100%" }}
            headStyle={{ borderBottom: "1px solid #1f2937" }}
          >
            <Table
              rowKey="id"
              columns={columns}
              dataSource={items}
              loading={loading}
              pagination={{ pageSize: 6, showSizeChanger: false }}
              // onRow={(record) => ({
              //   onClick: () => handlePick(record),
              // })}
            />
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <div className="column-stack">
            <Card
              className="frosted-card grow-card"
              title="编辑 / 更新"
              bordered={false}
              style={{ ...cardStyle }}
              headStyle={{ borderBottom: "1px solid #1f2937" }}
            >
              <Form
                form={form}
                layout="vertical"
                initialValues={emptyForm}
                onValuesChange={() => setPreview((p) => p)}
                requiredMark={false}
            >
              <Form.Item label="ID" name="id">
                <Input placeholder="从左侧选择一条记录后自动填充" disabled />
              </Form.Item>
              <Form.Item name="logoDataUrl" hidden>
                <Input type="hidden" />
              </Form.Item>

                <Form.Item
                  label="名称"
                  name="name"
                  rules={[{ required: true, message: "请输入名称" }]}
                >
                  <Input placeholder="选择左侧记录开始编辑" />
                </Form.Item>

              <Form.Item label="二维码类型">
                <Input value="活码（仅活码入库）" disabled />
                <Form.Item name="type" initialValue="dynamic" hidden>
                  <Input type="hidden" />
                </Form.Item>
              </Form.Item>

                <Form.Item
                  label="内容 / 链接"
                  name="content"
                  rules={[{ required: true, message: "请输入内容" }]}
                >
                  <TextArea rows={3} />
                </Form.Item>

                <Form.Item label="过期时间" name="expiresAt">
                  <DatePicker
                    showTime
                    style={{ width: "100%" }}
                    placeholder="不设置则不过期"
                  />
                </Form.Item>

                <Divider />
                <Title level={5} style={{ marginTop: 0, color: "#e5e7eb" }}>
                  样式
                </Title>

                <Row gutter={10}>
                  <Col span={12}>
                    <Form.Item label="前景色" name="colorDark">
                      <ColorPicker
                        format="hex"
                        value={values.colorDark || emptyForm.colorDark}
                        onChange={(_, hex) => form.setFieldValue("colorDark", hex)}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="背景色" name="colorLight">
                      <ColorPicker
                        format="hex"
                        value={values.colorLight || emptyForm.colorLight}
                        onChange={(_, hex) => form.setFieldValue("colorLight", hex)}
                      />
                    </Form.Item>
                  </Col>
                </Row>

              <Form.Item label="尺寸" name="size">
                <Segmented
                  block
                  options={sizeOptions}
                  value={values.size || emptyForm.size}
                  onChange={(val) => form.setFieldValue("size", val)}
                />
              </Form.Item>

              <Form.Item label="Logo（可选）">
                <Space align="center">
                  <Upload {...uploadProps}>
                    <Button icon={<UploadOutlined />}>上传 Logo</Button>
                  </Upload>
                  {values.logoDataUrl && (
                    <>
                      <Button
                        size="small"
                        type="text"
                        onClick={() => form.setFieldValue("logoDataUrl", "")}
                      >
                        清空
                      </Button>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 8,
                          overflow: "hidden",
                          border: "1px solid #1f2937",
                        }}
                      >
                        <img
                          src={values.logoDataUrl}
                          alt="logo preview"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      </div>
                    </>
                  )}
                </Space>
                {values.logoDataUrl && (
                  <>
                    <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                      已附加 Logo，预览可见。
                    </Text>
                    <Form.Item label="Logo 设置" style={{ marginBottom: 0, marginTop: 8 }}>
                      <Space size="large" wrap align="center">
                        <Form.Item
                          label={`大小 ${values.logoSizePercent || emptyForm.logoSizePercent}%`}
                          name="logoSizePercent"
                          style={{ marginBottom: 0, minWidth: 160 }}
                        >
                          <Slider min={5} max={50} step={1} tooltip={{ formatter: (v) => `${v}%` }} />
                        </Form.Item>
                        <Form.Item
                          label={`圆角 ${values.logoRadius || emptyForm.logoRadius}px`}
                          name="logoRadius"
                          style={{ marginBottom: 0, minWidth: 140 }}
                        >
                          <Slider
                            min={0}
                            max={50}
                            step={1}
                            tooltip={{ formatter: (v) => `${v}px` }}
                          />
                        </Form.Item>
                      </Space>
                    </Form.Item>
                  </>
                )}
              </Form.Item>

                <Space size="middle" wrap>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleUpdate}
                    loading={saving}
                  >
                    保存修改
                  </Button>
                  <Button icon={<ReloadOutlined />} onClick={() => form.setFieldsValue(emptyForm)}>
                    取消编辑
                  </Button>
                </Space>
              </Form>
            </Card>

            <Card
              className="frosted-card sticky-preview"
              title="实时预览"
              bordered={false}
              style={{ ...cardStyle }}
              headStyle={{ borderBottom: "1px solid #1f2937" }}
            >
              <div className="preview">
                {preview ? (
                  <img
                    src={preview}
                    alt="编辑预览"
                    width={values.size || emptyForm.size}
                    height={values.size || emptyForm.size}
                  />
                ) : (
                  <Paragraph className="muted">选择一条记录开始编辑并预览二维码</Paragraph>
                )}
                {preview && (
                  <Space style={{ marginTop: 8 }}>
                    <Button
                      type="primary"
                      icon={<DownloadOutlined />}
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = preview;
                        link.download = `${values.name || "qr-code"}.png`;
                        link.click();
                      }}
                    >
                      下载 PNG
                    </Button>
                  </Space>
                )}
              </div>
            </Card>
          </div>
        </Col>
      </Row>
    </Space>
  );
}
