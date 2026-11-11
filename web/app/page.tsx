"use client";

import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AudioStreamerClient from "@/src/clients/AudioStreamerClient";
import { ChangeEvent, useMemo, useState } from "react";

const FILTERS = [
  {
    type: "peaking",
    title: "Peaking",
    configurations: [
      {
        parameter: "frequency",
        title: "Frequency (Hz)",
        defaultValue: 100,
      },
      {
        parameter: "gainDb",
        title: "Gain (dB)",
        defaultValue: 0,
      },
      {
        parameter: "q",
        title: "Q",
        defaultValue: 100,
      },
    ],
  },
  {
    type: "lowpass",
    title: "Low-pass filter",
    configurations: [
      {
        parameter: "frequency",
        title: "Cut-off Frequency (Hz)",
        defaultValue: 100,
      },
    ],
  },
  {
    type: "lowpass_matlab",
    title: "Low-pass filter (MATLAB)",
    configurations: [
      {
        parameter: "frequency",
        title: "Cut-off Frequency (Hz)",
        defaultValue: 100,
      },
    ],
  },
  {
    type: "highpass",
    title: "High-pass filter",
    configurations: [
      {
        parameter: "frequency",
        title: "Cut-off Frequency (Hz)",
        defaultValue: 100,
      },
    ],
  },
  {
    type: "pitchshift",
    title: "Pitch shift",
    configurations: [
      {
        parameter: "semitones",
        title: "Semitones",
        defaultValue: 0,
      },
    ],
  },
];

export default function Home() {
  const [selectedFilterType, setSelectedFilterType] = useState<string | null>(
    null,
  );
  const [configurationValue, setConfigurationValue] = useState<{
    [key: string]: string;
  }>({});

  const currentConfigurations = useMemo(() => {
    if (!selectedFilterType) {
      return null;
    }

    const filter = FILTERS.find((item) => item.type === selectedFilterType);
    if (!filter) {
      return null;
    }

    return filter.configurations;
  }, [selectedFilterType]);

  const handleChangeFilter = (value: string | null) => {
    setSelectedFilterType(value);
    const filter = FILTERS.find((item) => item.type === value);

    const defaultValue: { [key: string]: string } = {};
    filter?.configurations.forEach((item) => {
      defaultValue[item.parameter] = String(item.defaultValue);
    });
    setConfigurationValue(defaultValue);
  };

  const handleChangeConfiguration = (
    event: ChangeEvent<HTMLInputElement>,
    parameterKey: string,
  ) => {
    setConfigurationValue((value) => ({
      ...value,
      [parameterKey]: event.target.value,
    }));
  };

  return (
    <div className="p-8">
      <div className="my-4">
        <Select
          items={FILTERS.map((item) => ({
            label: item.title,
            value: item.type,
          }))}
          value={selectedFilterType}
          onValueChange={handleChangeFilter}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {FILTERS.map((item) => (
                <SelectItem key={item.type} value={item.type}>
                  {item.title}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {currentConfigurations && (
          <div className="flex flex-col gap-4 mt-4 w-2/3">
            {currentConfigurations.map((configuration) => (
              <Field key={configuration.parameter}>
                <FieldLabel htmlFor={configuration.parameter}>
                  {configuration.title}
                </FieldLabel>
                <Input
                  id={configuration.parameter}
                  type="text"
                  placeholder={configuration.title}
                  onChange={(e) =>
                    handleChangeConfiguration(e, configuration.parameter)
                  }
                  value={configurationValue[configuration.parameter] ?? ""}
                />
              </Field>
            ))}
          </div>
        )}
      </div>

      <AudioStreamerClient
        filterType={selectedFilterType}
        configurations={configurationValue}
      />
    </div>
  );
}
