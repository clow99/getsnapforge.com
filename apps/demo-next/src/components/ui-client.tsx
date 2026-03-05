"use client";

import type { ComponentType, ComponentProps } from "react";
import { Card as _Card } from "@velocityuikit/velocityui";

export { Alert, Badge, Divider, Title } from "@velocityuikit/velocityui";

type CardSlot<T extends ComponentType<any>> = ComponentType<ComponentProps<T>>;

export const Card: CardSlot<typeof _Card> = _Card;
export const CardHeader: CardSlot<typeof _Card.Header> = _Card.Header;
export const CardBody: CardSlot<typeof _Card.Body> = _Card.Body;
export const CardFooter: CardSlot<typeof _Card.Footer> = _Card.Footer;
