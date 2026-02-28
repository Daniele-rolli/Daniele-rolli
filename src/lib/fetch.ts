import { load } from "cheerio";
import type { Element } from "domhandler";
import _ from "lodash";

type ColorLevel = 0 | 1 | 2 | 3 | 4;

const COLOR_MAP: Record<ColorLevel, string> = {
    0: "#ebedf0",
    1: "#9be9a8",
    2: "#40c463",
    3: "#30a14e",
    4: "#216e39"
};

type YearLink = {
    href: string;
    text: string;
};

type ContributionValue = {
    date: string;
    count: number;
    color: string;
    intensity: number | string;
};

type FlatContribution = ContributionValue;

type NestedContributions = {
    [year: number]: {
        [month: number]: {
            [day: number]: ContributionValue;
        };
    };
};

type YearData = {
    year: string;
    total: number;
    range: {
        start?: string;
        end?: string;
    };
    contributions: FlatContribution[] | NestedContributions;
};

type Format = "flat" | "nested";

async function fetchYears(username: string): Promise<YearLink[]> {
    const res = await fetch(
        `https://github.com/${username}?tab=contributions`,
        {
            headers: { "x-requested-with": "XMLHttpRequest" }
        }
    );

    const body = await res.text();
    const $ = load(body);

    return $(".js-year-link.filter-item")
        .get()
        .map((el: Element) => {
            const $el = $(el);
            const href = $el.attr("href") ?? "";
            const githubUrl = new URL(`https://github.com${href}`);
            githubUrl.searchParams.set("tab", "contributions");

            return {
                href: `${githubUrl.pathname}${githubUrl.search}`,
                text: $el.text().trim()
            };
        });
}

async function fetchDataForYear(
    url: string,
    year: string,
    format: Format
): Promise<YearData> {
    const res = await fetch(`https://github.com${url}`, {
        headers: { "x-requested-with": "XMLHttpRequest" }
    });

    const $ = load(await res.text());
    const $days = $(
        "table.ContributionCalendar-grid td.ContributionCalendar-day"
    );

    const contribText = $(".js-yearly-contributions h2")
        .text()
        .trim()
        .match(/^([0-9,]+)\s/);

    let total = 0;
    if (contribText) {
        total = parseInt(contribText[1].replace(/,/g, ""), 10);
    }

    const parseDay = (day: Element, index: number) => {
        const $day = $(day);
        const dateStr = $day.attr("data-date") ?? "";
        const [y, m, d] = dateStr.split("-").map(Number);

        const level = ($day.attr("data-level") ?? 0) as ColorLevel;

        const value: ContributionValue = {
            date: dateStr,
            count: index === 0 ? total : 0,
            color: COLOR_MAP[level],
            intensity: level
        };

        return { y, m, d, value };
    };

    const contributions =
        format !== "nested"
            ? $days.get().map((day, i) => parseDay(day, i).value)
            : $days.get().reduce<NestedContributions>((acc, day, i) => {
                const { y, m, d, value } = parseDay(day, i);
                if (!acc[y]) acc[y] = {};
                if (!acc[y][m]) acc[y][m] = {};
                acc[y][m][d] = value;
                return acc;
            }, {});

    return {
        year,
        total,
        range: {
            start: $($days.get(0)).attr("data-date"),
            end: $($days.get($days.length - 1)).attr("data-date")
        },
        contributions
    };
}

export async function fetchDataForAllYears(
    username: string,
    format: Format = "flat"
): Promise<{
    years: Record<string, Omit<YearData, "contributions">> | Omit<YearData, "contributions">[];
    contributions: FlatContribution[] | NestedContributions;
}> {
    const years = await fetchYears(username);
    const data = await Promise.all(
        years.map(y => fetchDataForYear(y.href, y.text, format))
    );

    const yearsResult =
        format === "nested"
            ? data.reduce<Record<string, Omit<YearData, "contributions">>>(
                (acc, { contributions, ...rest }) => {
                    acc[rest.year] = rest;
                    return acc;
                },
                {}
            )
            : data.map(({ contributions, ...rest }) => rest);

    const contributionsResult =
        format === "nested"
            ? data.reduce<NestedContributions>(
                (acc, curr) => _.merge(acc, curr.contributions),
                {}
            )
            : data
                .flatMap(d => d.contributions as FlatContribution[])
                .sort((a, b) => (a.date < b.date ? 1 : -1));

    return {
        years: yearsResult,
        contributions: contributionsResult
    };
}
