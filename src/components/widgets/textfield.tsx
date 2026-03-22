import { forwardRef, type InputHTMLAttributes } from "react";
import { Search } from 'lucide-react';
import { Row } from "../layout";

export const TextField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>((props, ref) => {
    return (
        <Row className="w-full relative bg-white/20 items-center rounded-4xl px-3">
            <Search color="#efefef" size={20} className="shrink-0" />
            <input ref={ref} {...props} className="w-full bg-transparent rounded-4xl outline-none p-2 pl-2" />
        </Row>
    );
});
TextField.displayName = 'TextField';