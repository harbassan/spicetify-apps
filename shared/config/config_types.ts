export type ConfigProps = Record<string, any>;

export interface ConfigWrapperProps {
    config: ConfigProps;
    launchModal: (callback: () => void) => void;
}

export type ModalStructureProps = ModalStructureRowProps[];

type SharedProps = {
    name: string;
    key: string;
    desc?: string;
    def: any;
    sectionHeader?: string;
    callback?: (value: any) => void;
};

type ModalStructureRowProps = SharedProps &
    (
        | { type: "toggle" /* other props for toggle */ }
        | { type: "text"; placeholder?: string /* other props for text */ }
        | { type: "dropdown"; options: string[] /* other props for dropdown */ }
        | { type: "slider"; min: number; max: number; step: number /* other props for slider */ }
    );
