import { useState, useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { mapInstanceAtom } from '../../store/mapStore';
import { TextField } from '@components/widgets/textfield';
import { Row, Column, Spacer, Divider } from '@components/layout';
import { Bookmark, ChevronDown, CirclePlusIcon, ClipboardListIcon, LandPlotIcon, LeafIcon, LocateFixedIcon, LocateIcon, MapPinIcon, PlusIcon } from 'lucide-react';
import { Accordion, Button, Checkbox, Chip, Label, Separator } from "@heroui/react";
import {
    ArrowsRotateLeft,
    Box,
    CircleFill,
    CreditCard,
    PlanetEarth,
    Receipt,
    ShoppingBag,
} from "@gravity-ui/icons";
import { WithSections } from '@components/widgets/with_sections';
const items = [
    {
        content:
            "Browse our products, add items to your cart, and proceed to checkout. You'll need to provide shipping and payment information to complete your purchase.",
        icon: <ShoppingBag />,
        title: "How do I place an order?",
    },
    {
        content:
            "Yes, you can modify or cancel your order before it's shipped. Once your order is processed, you can't make changes.",
        icon: <Receipt />,
        title: "Can I modify or cancel my order?",
    },
    {
        content: "We accept all major credit cards, including Visa, Mastercard, and American Express.",
        icon: <CreditCard />,
        title: "What payment methods do you accept?",
    },
    {
        content:
            "Shipping costs vary based on your location and the size of your order. We offer free shipping for orders over $50.",
        icon: <Box />,
        title: "How much does shipping cost?",
    },
    {
        content:
            "Yes, we ship to most countries. Please check our shipping rates and policies for more information.",
        icon: <PlanetEarth />,
        title: "Do you ship internationally?",
    },
    {
        content:
            "If you're not satisfied with your purchase, you can request a refund within 30 days of purchase. Please contact our customer support team for assistance.",
        icon: <ArrowsRotateLeft />,
        title: "How do I request a refund?",
    },
];
export const Sidebar = () => {
    const [expandedKeys, setExpandedKeys] = useState<any>(new Set([]));
    const mapInstance = useAtomValue(mapInstanceAtom);

    useEffect(() => {
        if (!mapInstance) return;

        if (expandedKeys.size > 0) {
            mapInstance.flyTo({ center: [101.579118, 12.790948], zoom: 18, essential: true, duration: 1000 });
            // mapInstance.flyTo({ center: [100.9753017, 13.7153979], zoom: 16, essential: true, duration: 1000 });
        }
        else {
            mapInstance.flyTo({ center: [101.4918194, 12.5352438], zoom: 5, essential: true, duration: 1000 });
        }
    }, [expandedKeys, mapInstance]);

    return (
        <Row className='absolute h-[calc(100%-10px)] top-[5px] left-[5px] z-1 gap-[5px] '>
            <Column className={`w-[65px] bg-[#1E1E1E]/90 backdrop-blur-lg rounded-2xl overflow-hidden items-center gap-3 `} >
                <img src="https://kkndpqqmsswhgnupsznq.supabase.co/storage/v1/object/public/Public/Ab636a786a6f647abb66c905a4aeb1f170.webp" alt="" className='w-10 h-10 rounded-lg mt-3' />
                <Divider />
                <Column className='gap-4'>
                    <LeafIcon color='#7f7f7f' />
                    <ClipboardListIcon color='#7f7f7f' />
                </Column>
                <Spacer />
                <img src="https://kkndpqqmsswhgnupsznq.supabase.co/storage/v1/object/public/Public/256.webp" alt="profile" className='w-8 h-8 rounded-full mb-3' />
            </Column>
            <Column className='w-[380px]  bg-white/90 backdrop-blur-lg rounded-3xl overflow-hidden p-3'>
                {/* <TextField placeholder='ค้นหา' /> */}
                {/* <Row className='gap-2 items-center'>
                <span className='text-xl'>โปรเจค</span>
                <Spacer />
                <Button>
                    <CirclePlusIcon size={24} fill='white' color='#0087ff' />
                    <span className='text-sm text-white mr-2 ml-2'>สร้าง</span>
                </Button>
            </Row> */}
                <Accordion className="w-full max-w-md " variant="surface" expandedKeys={expandedKeys} onExpandedChange={setExpandedKeys}>
                    {items.map((item, index) => (
                        <Accordion.Item key={index} id={index.toString()}>
                            <Accordion.Heading>
                                <Accordion.Trigger className="flex items-center">
                                    <Accordion.Indicator className="mr-2 ml-0!">
                                        <ChevronDown />
                                    </Accordion.Indicator>

                                    {/* {item.icon ? (
                                    <span className="mr-3 size-4 shrink-0 text-muted">{item.icon}</span>
                                ) : null} */}
                                    <img src="https://kkndpqqmsswhgnupsznq.supabase.co/storage/v1/object/public/Public/Gemini_Generated_Image_nnmv0nnnmv0nnnmv.png" alt="profile" className='w-15 h-15 rounded-xl ' />
                                    <Column className='ml-2 mr-auto'>
                                        <Label className=''>ฟาร์มของฉัน</Label>
                                        <Label className=' text-gray-400 text-[12px]'>7 แปลง</Label>
                                        <Chip className=''>
                                            <MapPinIcon size={16} color='#ebebec' fill='red' />
                                            <Chip.Label>สุราษฎร์ธานี</Chip.Label>
                                        </Chip>
                                    </Column>
                                    {/* <Button isIconOnly variant='outline' onClick={(e) => {
                                        e.stopPropagation();
                                        window.dispatchEvent(new CustomEvent('fly-to-map', { detail: { lat: 12.5352438, lng: 101.4918194 } }));
                                    }}>
                                        <LocateFixedIcon size={23} color='#3ca489' />
                                    </Button> */}
                                    <WithSections />
                                </Accordion.Trigger>

                            </Accordion.Heading>
                            <Accordion.Panel>
                                <Accordion.Body>
                                    <Column className='gap-2  pl-10'>
                                        <Row className='items-center'>
                                            <img src="https://kkndpqqmsswhgnupsznq.supabase.co/storage/v1/object/public/Public/land.webp" alt="profile" className='w-10 h-10 rounded-lg object-cover ' />
                                            <Column className='ml-2 mr-auto'>
                                                <Label className=''>แปลงทุเรียน</Label>
                                                <Row className='items-center gap-2'>
                                                    <Chip className='bg-green-500/20 text-green-500'>
                                                        <img src="https://kkndpqqmsswhgnupsznq.supabase.co/storage/v1/object/public/Public/durian.png" alt="profile" className='w-3 h-3 rounded-lg object-cover ' />
                                                        <Chip.Label>ทุเรียน</Chip.Label>
                                                    </Chip>
                                                </Row>
                                            </Column>
                                        </Row>
                                        <Separator />
                                        <Row className='items-center '>
                                            <img src="https://kkndpqqmsswhgnupsznq.supabase.co/storage/v1/object/public/Public/land.webp" alt="profile" className='w-10 h-10 rounded-lg object-cover ' />
                                            <Column className='ml-2 mr-auto'>
                                                <Label className=''>แปลงทุเรียน</Label>
                                                <Label className=' text-gray-400 text-[12px]'>7 แปลง</Label>
                                            </Column>
                                        </Row>
                                        <Separator />
                                        <Row className='items-center '>
                                            <img src="https://kkndpqqmsswhgnupsznq.supabase.co/storage/v1/object/public/Public/land.webp" alt="profile" className='w-10 h-10 rounded-lg object-cover ' />
                                            <Column className='ml-2 mr-auto'>
                                                <Label className=''>แปลงทุเรียน</Label>
                                                <Label className=' text-gray-400 text-[12px]'>7 แปลง</Label>
                                            </Column>
                                        </Row>
                                    </Column>
                                </Accordion.Body>
                            </Accordion.Panel>
                        </Accordion.Item>
                    ))}
                </Accordion>
            </Column>
        </Row>
    );
};
